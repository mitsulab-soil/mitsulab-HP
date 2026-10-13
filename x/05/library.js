/* mitsulab 共通の部品（library.js）。© 2026 mitsulab. All rights reserved. */

const HP = document.documentElement.dataset.hp || "/";
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const Q = new URLSearchParams(location.search);
const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
const SUBJ_COLOR = { being: "#7fe0b4", human: "#f4aa96", machine: "#b4a2ff" };
const SUBJ_EN = { being: "beings", human: "humans", machine: "machines" };
const MARK = { "◎": "典拠あり", "△": "議論中・諸説", "◐": "近い仲間などの研究から推しはかった", "○": "典拠を確かめていない" };

const [NAMES, DATA] = await Promise.all([fetch("names.json").then(r => r.json()), fetch("cards_public.json").then(r => r.json())]);
const CARDS = DATA.カード, BY = Object.fromEntries(CARDS.map(c => [c.id, c]));
const DIMS = DATA.次元, DIMNAME = Object.fromEntries(DIMS.map(d => [d.key, d.名前])), DIMORDER = Object.fromEntries(DIMS.map((d, i) => [d.key, i]));
const SUBJS = DATA.主体;
const primKey = c => DIMS.find(d => d.名前 === c.主の次元)?.key;
// 「同じ次元のカード」＝この一枚の主の次元を、主か関わる次元として受けとるカード
const related = c => c.つながり.filter(l => l.次元keys.includes(primKey(c)));

if (Q.get("shot")) document.body.dataset.shot = "1";   // ポスター用の一枚（UI を隠す）
// ---- 名前（names.json）
for (const el of $$("[data-name]")) el.textContent = NAMES[el.dataset.name] || "";
document.title = `${NAMES.app}　${NAMES.sub} ／ mitsulab`;
$$(".ml-t").forEach(el => el.textContent = NAMES.app); $$("#ml-loader .ml-en, .ml-loader .ml-en").forEach(el => el.textContent = NAMES.sub);
$$("[data-hp-link]").forEach(a => a.href = HP === "/" ? "/" : "https://mitsulab.jp/");
document.body.style.setProperty("--poster", "url(poster.webp)");
// 英字・数の書体は HP の自前の書体を使う（和文は端末の明朝・ゴシック。外の書体サービスは読まない）
{ const f = (fam, file, st = "normal", w = 400) => `@font-face{font-family:"${fam}";font-style:${st};font-weight:${w};font-display:swap;src:url(${HP}fonts/${file}) format("woff2");unicode-range:U+20-7E,U+A9,U+B7,U+2013,U+2014,U+2019,U+201C,U+201D}`;
  const s = document.createElement("style"); s.textContent = [f("Cormorant Garamond", "cormorant-garamond-i500.woff2", "italic", 500), f("JetBrains Mono", "jetbrains-mono-400.woff2"), f("Inter", "inter-400.woff2"), f("Inter", "inter-500.woff2", "normal", 500)].join("\n"); document.head.append(s); }

// ---- 字の整え（典拠の雑誌名の *…* は斜体、**…** は外す、URL はリンク、◎△○ は印）
// ことば（カードの文に出てくる語だけ、読む板の折りたたみに出す。教科書の範囲の説明）
const GLOSS = [
  ["受容体", "光やにおいの分子などを受けとって、神経の信号に変える分子や細胞。このカードでは「その光によく応える細胞」の意味。"],
  ["網膜", "目の奥にある、光を受けとる細胞が並んだ膜。"],
  ["錐体", "網膜にある、明るいところで色を受けとる細胞。人はふつう 3 種類をもつ。"],
  ["複眼", "小さな目（個眼）がたくさん集まってできた、昆虫などの目。"],
  ["単眼", "一つのレンズでできた小さな目。ミツバチは頭の上に 3 つもつ。"],
  ["偏光", "光の波がゆれる向きがそろっている状態。空の光は、太陽との角度によって一部がそろっている。"],
  ["nm", "ナノメートル。10 億分の 1 メートル。光の波長の単位で、人に見える光はおよそ 400〜700 nm。"],
  ["油球", "鳥などの錐体の中にある、色のついた油の粒。フィルターのように、届く光の色をしぼる。"],
  ["近赤外", "赤より少し波長が長く、人の目には見えない光。植物の葉はよく反射する。"],
  ["周波数", "1 秒間に振動する回数。単位はヘルツ（Hz）。1 kHz は 1000 Hz。"],
  ["伏角", "地磁気の向きが、水平の面となす角。赤道の近くで小さく、極に近いほど大きい。"],
  ["クリプトクロム", "光を受けとるタンパク質の一つ。渡り鳥の磁気の感覚に関わるという説がある（議論が続いている）。"],
  ["珪藻", "ガラス質の殻をもつ小さな藻。種類によって海・汽水・淡水のどこにすむかが分かれるので、化石は昔の水辺の手がかりになる。"],
  ["放射性炭素", "炭素 14。生き物が死ぬと決まった速さで減っていくので、残りの量から年代を測れる。"],
  ["未較正", "放射性炭素で測った年代を、暦の年に直す前の値。直すと数字がずれる。"],
  ["標高", "海面からの高さ。"],
  ["季語", "俳句で、季節を表すことば。"],
  ["視蓋", "脳の中ほど（中脳）にある部分。目などからの知らせを受けて、ものの向きや位置をまとめる。"],
  ["TRPA1", "細胞の膜にあるたんぱく質の一つ。マムシのなかまのピットの神経では、温まると開いて信号を出す。"],
  ["頭部伝達関数", "音が耳の奥に届くまでに、頭・耳たぶ・肩の形によって変わる、その変わり方。人ごとに違う。"],
  ["随伴性", "自分が動くと、受けとる知らせがどう変わるか、という決まった結びつき。"],
  ["二十四節気", "1 年を、太陽の動きに合わせて 24 に分けた暦の区切り。"],
];
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function fmt(s) {
  let h = esc(s).replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "<i>$1</i>");
  h = h.replace(/https?:\/\/[^\s<）)、。]+/g, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
  h = h.replace(/([◎△◐○])(?=\s|$|。|<)/g, (m, k) => `<span class="mk" title="${MARK[k]}">${k}</span>`);
  return h;
}

// ---- たとえば（最初の画面に、一枚の驚きを一行で）
const HOOKS = ["TC-007", "TC-012", "TC-010", "TC-022", "TC-013", "TC-008"].filter(id => BY[id]);
{ const hk = location.hash.slice(1).toLowerCase(), hc = CARDS.find(x => x.key === hk);
  const c = hc || BY[HOOKS[Math.floor(Math.random() * HOOKS.length)]];
  for (const el of $$("[data-hook]")) { el.innerHTML = `<span class="hk">たとえば</span><span class="ht">${esc(c.一行)}</span><button class="ml-btn ml-btn--quiet" type="button" data-open="${c.id}">${esc(c.名前)} を読む →</button>`;
    el.addEventListener("click", e => { const b = e.target.closest("[data-open]"); if (b) open(b.dataset.open); }); } }
// ---- しぼりこみ
const F = { subj: "all", dim: "all" };
const match = c => (F.subj === "all" || c.主体key === F.subj) && (F.dim === "all" || c.次元keys.includes(F.dim));
const listeners = [];
function buildFilters() {
  for (const box of $$('[data-f="subj"]')) {
    box.innerHTML = [`<button class="ml-btn" type="button" data-v="all" aria-pressed="true">すべて</button>`]
      .concat(SUBJS.filter(s => CARDS.some(c => c.主体key === s.key)).map(s => `<button class="ml-btn" type="button" data-v="${s.key}" aria-pressed="false" title="${esc(s.定義)}">${esc(s.名前)}</button>`)).join("");
  }
  for (const box of $$('[data-f="dim"]')) {
    box.innerHTML = [`<button class="ml-btn" type="button" data-v="all" aria-pressed="true">すべて</button>`]
      .concat(DIMS.map(d => `<button class="ml-btn" type="button" data-v="${d.key}" aria-pressed="false" title="${esc(d.媒体)}">${esc(d.名前)}</button>`)).join("");
  }
  for (const box of $$("[data-f]")) box.addEventListener("click", e => {
    const b = e.target.closest("button[data-v]"); if (!b) return;
    F[box.dataset.f] = b.dataset.v; applyFilter();
  });
}
function applyFilter() {
  for (const box of $$("[data-f]")) for (const b of $$("button", box)) b.setAttribute("aria-pressed", String(b.dataset.v === F[box.dataset.f]));
  const n = CARDS.filter(match).length;
  $$("[data-count]").forEach(el => el.textContent = `${CARDS.length} 枚のうち ${n} 枚`);
  for (const li of $$(".items > li")) li.hidden = !match(BY[li.dataset.id]);
  for (const g of $$(".group")) g.hidden = !$$(".items > li", g).some(li => !li.hidden);
  listeners.forEach(f => f());
}

// ---- 一覧（スマホでは主の画面。PC では「一覧で見る」）
function buildList() {
  const html = [];
  for (const s of SUBJS) {
    const cs = CARDS.filter(c => c.主体key === s.key).sort((a, b) => (DIMORDER[primKey(a)] - DIMORDER[primKey(b)]) || a.id.localeCompare(b.id));
    if (!cs.length) continue;
    html.push(`<section class="group" style="--sc:${SUBJ_COLOR[s.key]}"><h2>${esc(s.名前)}<span>${SUBJ_EN[s.key]}</span></h2><ul class="items">`);
    for (const c of cs) html.push(`<li data-id="${c.id}"><button class="item ml-panel" type="button" data-open="${c.id}" style="--sc:${SUBJ_COLOR[s.key]}">
      <span class="ik"><span><b>${esc(c.主の次元)}</b>${c.関わる次元.length ? "　＋" + c.関わる次元.map(esc).join("・") : ""}</span><span>${c.id}<span class="mk" title="${MARK[c.確からしさ]}">${c.確からしさ}</span></span></span>
      <span class="in">${esc(c.名前)}</span><span class="io">${esc(c.一行)}</span></button></li>`);
    html.push(`</ul></section>`);
  }
  $("#groups").innerHTML = html.join("");
  $("#groups").addEventListener("click", e => { const b = e.target.closest("[data-open]"); if (b) open(b.dataset.open, { from: "list" }); });
}

// ---- 読む板
let current = null, lastFocus = null;
const hooks = { open: [], close: [] };
function readerHTML(c) {
  const sec = (ja, en, items, note = "") => items.length ? `<section class="r-sec"><h3>${ja}<span>${en}</span></h3>${note}<ul>${items.map(t => `<li>${fmt(t)}</li>`).join("")}</ul></section>` : "";
  const rel = related(c).map(l => ({ c: BY[l.id], dims: l.次元keys.map(k => DIMNAME[k]) })).sort((a, b) => b.dims.length - a.dims.length || a.c.id.localeCompare(b.c.id));
  return `<div class="r-kick"><span>${c.id}</span><span style="color:${SUBJ_COLOR[c.主体key]}">${esc(c.主体)} ・ ${esc(c.主の次元)}</span>${c.関わる次元.length ? `<span>関わる次元：${c.関わる次元.map(esc).join("・")}</span>` : ""}<span class="mk" title="${MARK[c.確からしさ]}">${c.確からしさ} ${MARK[c.確からしさ]}</span></div>
    <h2 class="r-name" id="r-name">${esc(c.名前)}</h2>
    <p class="r-one">${fmt(c.一行)}</p>
    <ul class="tags" aria-label="分野">${c.分野.map(f => `<li>${esc(f)}</li>`).join("")}</ul>
    ${sec("仕組み", "how it works", c.仕組み)}
    ${sec("どうやって分かったか", "how we know", c.どうやって分かったか)}
    ${sec("まだ分からないこと", "still open", c.まだ分からないこと)}
    ${sec("人に届く翻訳", "a model made for people", c.人に届く翻訳, `<p class="r-note">手がかりを、人の目・耳・手に届く形に写した模式です。ほかの者の受けとり方そのものではありません。</p>`)}
    ${c.試せる作品.length ? `<section class="r-sec"><h3>試せる作品<span>try it</span></h3><ul class="works">${c.試せる作品.map(w => `<li><a href="${esc(w.url)}" target="_blank" rel="noopener"><span>${esc(w.名前)}<small>${esc(w.一言)}</small></span><span aria-hidden="true">↗</span></a></li>`).join("")}</ul></section>` : ""}
    ${rel.length ? `<section class="r-sec"><h3>同じ次元のカード<span>shared dimension</span></h3><div class="rel">${rel.map(r => `<button type="button" data-open="${r.c.id}"><i>${r.dims.join("・")}</i>${esc(r.c.名前)}</button>`).join("")}</div></section>` : ""}
    ${(() => { const all = JSON.stringify([c.一行, c.仕組み, c.どうやって分かったか, c.まだ分からないこと, c.人に届く翻訳]); const g = GLOSS.filter(([w]) => all.includes(w));
      return g.length ? `<details class="ml-fold r-sec"><summary>ことば（${g.length}）</summary><dl class="gloss">${g.map(([w, d]) => `<dt>${esc(w)}</dt><dd>${esc(d)}</dd>`).join("")}</dl></details>` : ""; })()}
    <details class="ml-fold r-sec"><summary>典拠（${c.典拠.length}）</summary><ol class="refs">${c.典拠.map(t => `<li>${fmt(t)}</li>`).join("")}</ol></details>`;
}
function open(id, { from = "" } = {}) {
  const c = BY[id]; if (!c) return;
  if (!current) lastFocus = document.activeElement;
  current = c;
  $("#r-body").innerHTML = readerHTML(c);
  const r = $("#reader"); r.hidden = false; r.scrollTop = 0;
  document.body.dataset.reading = c.id;
  history.replaceState(null, "", "#" + c.key);
  hooks.open.forEach(f => f(c));
  $("#closeReader").focus({ preventScroll: true });
}
function close() {
  if (!current) return;
  current = null; $("#reader").hidden = true; delete document.body.dataset.reading;
  history.replaceState(null, "", location.pathname + location.search);
  hooks.close.forEach(f => f());
  lastFocus?.focus?.({ preventScroll: true });
}
$("#reader").addEventListener("click", e => { const b = e.target.closest("[data-open]"); if (b) open(b.dataset.open); });
$("#closeReader").addEventListener("click", close);
addEventListener("hashchange", () => { const k = location.hash.slice(1).toLowerCase(), c = CARDS.find(x => x.key === k); if (c && c !== current) open(c.id); });
addEventListener("keydown", e => { if (e.key === "Escape") { if (current) close(); else if (document.body.dataset.mode === "3d" && !$("#list").hidden) showList(false); } });

// ---- 画面の型を決める
function webgl() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } }
const wantList = Q.get("mode") === "list" || Math.min(innerWidth, innerHeight) < 600 || innerWidth < 760 || !webgl();
buildFilters(); buildList(); applyFilter();
function showList(on) { $("#list").hidden = !on; if (on) $("#closeList").focus({ preventScroll: true }); else $("#openList").focus({ preventScroll: true }); }
$("#openList").addEventListener("click", () => showList(true));
$("#closeList").addEventListener("click", () => showList(false));
$("#list").addEventListener("click", e => { if (document.body.dataset.mode === "3d" && e.target.closest("[data-open]")) showList(false); }, true);

const fromHash = () => { const k = location.hash.slice(1).toLowerCase(); const c = CARDS.find(x => x.key === k); return c?.id; };
if (wantList) {
  document.body.dataset.mode = "list"; $("#list").hidden = false;
  window.MLLoader?.done();
  const h = fromHash(); if (h) open(h);
} else {
  document.body.dataset.mode = "3d"; $("#list").hidden = true;
  try { await start3D(); }
  catch (e) { console.warn("3D をあきらめて一覧にしました", e); document.body.dataset.mode = "list"; $("#list").hidden = false; window.MLLoader?.done(); }
  const h = fromHash(); if (h) open(h);
}

// ================= 3D =================
async function start3D() {
  const THREE = await import("three");
  const K = await import("./kit/index.js");
  const stage = $("#stage");
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  stage.append(renderer.domElement); renderer.domElement.tabIndex = -1;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, .1, 600);
  const fit = K.fitRenderer(renderer, camera, stage);
  const R = K.rng(1013);
  // 時刻＝日の入りのすぐあと（碧の時刻より 20 分ほど前）。2026-10-13 に空・霧・地の光を明るくした。
  // 光は一つの太陽（西の低い残り日）と空の光だけ。カードの白い字と線が読める中ほどの明るさにとどめる（昼にすると白い字と線が消える）
  const atm = K.applyAtmosphere(renderer, scene, "aoi_hour", { override: {
    sky: [0x4a6f96, 0xaebccb], band: 0xe8bf98, fog: [0x8c9cae, 0.018], hemi: [0xe4eef8, 0x6a5a48, 1.9], sun: [0xffd6ae, 1.8, [-30, 10, -40]], exposure: 1.5 } });
  window.MLLoader?.progress(.15);

  // ---- 場所：雑木林の空き地（地面・木・草）
  const H = (x, z) => { const r = Math.hypot(x, z); return .18 * Math.sin(x * .16 + .4) * Math.cos(z * .13) + .1 * Math.sin((x - z) * .08) + Math.max(0, r - 9) * .035; };
  const TL = new THREE.TextureLoader(), tx = (f, srgb = true) => { const t = TL.load("tex/" + f); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; return t; };
  const nature = new THREE.Group(); scene.add(nature);
  K.groundPlane(nature, { size: 240, seg: 150, map: tx("soil_forest.webp"), height: H,
    tint: (x, z) => { const n = Math.sin(x * .7) * Math.sin(z * .6), r = Math.hypot(x, z), m = Math.max(0, Math.min(1, (8.5 - r) / 4)), k = .82 + .12 * n;
      return [(.72 * (1 - m) + .58 * m) * k, (.68 * (1 - m) + .74 * m) * k, (.6 * (1 - m) + .46 * m) * k]; } });
  const pts = K.poisson(R, { x0: -50, x1: 50, z0: -50, z1: 50, d: 5.4, tries: 4200, ok: (x, z) => { const r = Math.hypot(x, z); return r > 12 && r < 50 && !(z > 2 && Math.abs(x) < 6 && r < 18); } });
  const trees = pts.map(([x, z], i) => K.growTree(i % 5 === 0 ? "keyaki" : i % 7 === 3 ? "momiji" : "konara", x, z, R, { det: Math.hypot(x, z) < 18, q: 1.1, scale: .92 + R() * .25 }));
  for (const t of trees) { const y = H(t.trunk[0], t.trunk[1]) - .05; t.wood.forEach(g => g.translate(0, y, 0)); t.cards.forEach(c => { c[0].y += y; c[2].y += y; }); }
  const bark = K.barkMaterial(tx("bark_zelkova.webp"), { normalMap: tx("bark_zelkova_n.webp", false) });
  const barkK = K.barkMaterial(tx("bark_camphor.webp"), { normalMap: tx("bark_camphor_n.webp", false), color: 0xb4aea4 });
  const leaf = K.leafMaterial(tx("leaf_spray.webp")), leaf2 = K.leafMaterial(tx("leaf_spray2.webp"));
  [leaf.map, leaf2.map].forEach(t => t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping);
  K.plantTrees(nature, trees, { barkMat: { keyaki: bark, konara: barkK, default: bark }, leafMats: { konara: leaf2, keyaki: leaf, default: leaf }, R });
  const grass = K.grassField(nature, R, { count: 5000, area: 20, ok: (x, z) => { const r = Math.hypot(x, z); return r > 1.6 && r < 10; } });
  { const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    for (let i = 0; i < grass.count; i++) { grass.getMatrixAt(i, m4); m4.decompose(p, q, s); p.y = H(p.x, p.z) - .02; m4.compose(p, q, s); grass.setMatrixAt(i, m4); } grass.instanceMatrix.needsUpdate = true; }
  window.MLLoader?.progress(.45);

  // ---- 置き方：主体ごとの弧（左から 生き物・人・機械）、その中で次元ごとの列（一列に 3 枚まで）
  const RAD = 6.4, W = .9, Hh = 1.2, ROWS = [1.02, 2.34, 3.66];
  const cols = [];   // {subj, dim, cards[]}
  const sectors = [];
  for (const s of SUBJS) {
    const cs = CARDS.filter(c => c.主体key === s.key); if (!cs.length) continue;
    const start = cols.length;
    for (const d of DIMS) {
      const g = cs.filter(c => primKey(c) === d.key).sort((a, b) => a.id.localeCompare(b.id));
      for (let i = 0; i < g.length; i += 3) cols.push({ subj: s.key, dim: d.key, cards: g.slice(i, i + 3), first: i === 0 });
    }
    sectors.push({ s, a: start, b: cols.length - 1 });
    cols.push(null);   // 主体のあいだのすき間
  }
  cols.pop();
  const STEP = .19, span = (cols.length - 1) * STEP, ang = i => -span / 2 + i * STEP;   // 角度（-z から右回り）
  const at = (a, y, r = RAD) => new THREE.Vector3(Math.sin(a) * r, y, -Math.cos(a) * r);
  const center = new THREE.Vector3(0, 0, 0);

  // ---- 標本の板
  await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]);
  const plates = [], pick = [];
  const glassGeo = new THREE.PlaneGeometry(W, Hh), backGeo = new THREE.PlaneGeometry(W, Hh);
  const edgeGeo = (() => { const w = W / 2, h = Hh / 2, k = .07, a = [-w, -h, 0, w, -h, 0, w, -h, 0, w, h, 0, w, h, 0, -w, h, 0, -w, h, 0, -w, -h, 0], c = [];
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = sx * w, y = sy * h; c.push(x, y, 0, x - sx * k, y, 0, x, y, 0, x, y - sy * k, 0); }
    const g1 = new THREE.BufferGeometry(); g1.setAttribute("position", new THREE.Float32BufferAttribute(a, 3));
    const g2 = new THREE.BufferGeometry(); g2.setAttribute("position", new THREE.Float32BufferAttribute(c, 3)); return [g1, g2]; })();
  function plateTex(c) {
    const cw = 600, ch = 800, cv = document.createElement("canvas"); cv.width = cw; cv.height = ch; const x = cv.getContext("2d");
    const col = SUBJ_COLOR[c.主体key], mono = '"JetBrains Mono",ui-monospace,monospace', serif = '600 52px "Shippori Mincho","Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif', sans = '"Inter","Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic UI","Noto Sans JP",sans-serif';
    x.fillStyle = "rgba(195,204,224,.55)"; x.font = `400 24px ${mono}`; x.textBaseline = "top"; x.fillText(c.id, 44, 46);
    x.textAlign = "right"; x.fillStyle = "rgba(155,220,240,.9)"; x.fillText(c.確からしさ, cw - 44, 46); x.textAlign = "left";
    x.fillStyle = col; x.font = `400 26px ${sans}`; x.fillText(`${c.主体}　・　${c.主の次元}`, 44, 96);
    const wrap = (text, font, lh, maxW, maxL, y0, color) => { x.font = font; x.fillStyle = color; let line = "", y = y0, n = 0;
      for (const chh of text) { const t = line + chh; if (x.measureText(t).width > maxW && line) { if (++n >= maxL) { x.fillText(line.slice(0, -1) + "…", 44, y); return y + lh; } x.fillText(line, 44, y); y += lh; line = chh; } else line = t; }
      if (line) { x.fillText(line, 44, y); y += lh; } return y; };
    let y = wrap(c.名前, serif.replace("52px", "60px"), 80, cw - 88, 3, 156, "#eef5fb");
    x.fillStyle = "rgba(150,170,240,.35)"; x.fillRect(44, y + 18, 80, 2);
    y = wrap(c.一行, `400 27px ${sans}`, 46, cw - 88, Math.max(3, Math.floor((ch - 120 - (y + 48)) / 46)), y + 48, "rgba(195,204,224,.92)");
    x.fillStyle = "rgba(143,155,180,.85)"; x.font = `400 21px ${mono}`; x.fillText(c.分野.join("  ·  "), 44, ch - 72);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  cols.forEach((col, i) => {
    if (!col) return;
    const a = ang(i);
    col.cards.forEach((c, k) => {
      const g = new THREE.Group(), color = new THREE.Color(SUBJ_COLOR[c.主体key]);
      // 板の地は、明るい林でも字が読めるよう、光に左右されない紺の半透明（明るさ 2026-10-13）
      const glass = new THREE.Mesh(glassGeo, new THREE.MeshBasicMaterial({ color: 0x070d1a, transparent: true, opacity: .7, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }));
      const back = new THREE.Mesh(backGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .035, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: true })); back.position.z = -.014;
      const text = new THREE.Mesh(glassGeo, new THREE.MeshBasicMaterial({ map: plateTex(c), transparent: true, depthWrite: false, toneMapped: false, fog: true })); text.position.z = .002;
      const edge = new THREE.LineSegments(edgeGeo[0], K.lineMaterial(color.getHex(), .3)), corner = new THREE.LineSegments(edgeGeo[1], K.lineMaterial(color.getHex(), .85));
      g.add(back, glass, text, edge, corner);
      const home = at(a, ROWS[k]); g.position.copy(home); g.lookAt(center.x, home.y, center.z);
      scene.add(g);
      const p = { c, g, glass, text, edge, corner, home: home.clone(), homeQ: g.quaternion.clone(), ph: R() * 6.28, vis: 1, visT: 1, hover: 0, fly: 0, flyT: 0 };
      glass.userData.plate = p; plates.push(p); pick.push(glass);
    });
  });
  const P = Object.fromEntries(plates.map(p => [p.c.id, p]));

  // ---- 札：主体（弧の上）と次元（列の足もと）。地面には主体の弧の線
  const labels = new THREE.Group(); scene.add(labels);
  for (const sc of sectors) {
    const a0 = ang(sc.a) - STEP * .45, a1 = ang(sc.b) + STEP * .45, mid = (a0 + a1) / 2, col = new THREE.Color(SUBJ_COLOR[sc.s.key]).getHex();
    const sp = K.textSprite(sc.s.名前, { sub: SUBJ_EN[sc.s.key], color: col, height: .34 }); sp.position.copy(at(mid, 3.86)); labels.add(sp);
    const arc = []; for (let k = 0; k < 40; k++) { const u = a0 + (a1 - a0) * k / 39, v = at(u, 0, RAD + .15); arc.push(v.x, H(v.x, v.z) + .04, v.z); }
    const ag = new THREE.BufferGeometry(); ag.setAttribute("position", new THREE.Float32BufferAttribute(arc, 3)); labels.add(new THREE.Line(ag, K.lineMaterial(col, .55)));
  }
  cols.forEach((col, i) => { if (!col || !col.first) return; const n = cols.filter(c => c && c.subj === col.subj && c.dim === col.dim).length;
    const sp = K.textSprite(DIMNAME[col.dim], { color: K.LAYER.aoi, height: .2 }); sp.position.copy(at(ang(i) + STEP * (n - 1) / 2, .46, RAD - .05)); labels.add(sp); });

  // ---- 事実の線：同じ次元を、ちがう主体が受けとるカードどうし（主の次元どうし）
  const lineMat = K.lineMaterial(K.LAYER.aoi, .34), lineMatHi = K.lineMaterial(K.LAYER.aoi, .85);
  function curve(a, b, lift = 1.1, n = 44) {
    const pa = a.clone(), pb = b.clone(), m = pa.clone().add(pb).multiplyScalar(.5); m.y += lift + pa.distanceTo(pb) * .08; m.multiplyScalar(1).setX(m.x * .92).setZ(m.z * .92);
    const q = new THREE.QuadraticBezierCurve3(pa, m, pb), pts = q.getPoints(n), arr = []; pts.forEach(v => arr.push(v.x, v.y, v.z));
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3)); return g;
  }
  const edgePoint = (p, toward) => { const v = p.home.clone(); v.y += (toward.y > v.y ? 1 : -1) * 0 + .0; return v.add(new THREE.Vector3(0, Hh * .5 + .02, 0)); };
  const bridges = [];
  for (let i = 0; i < CARDS.length; i++) for (let j = i + 1; j < CARDS.length; j++) {
    const a = CARDS[i], b = CARDS[j]; if (a.主体key === b.主体key || primKey(a) !== primKey(b)) continue;
    const pa = edgePoint(P[a.id], P[b.id].home), pb = edgePoint(P[b.id], P[a.id].home);
    const ln = new THREE.Line(curve(pa, pb), lineMat.clone()); ln.userData = { a: a.id, b: b.id, base: .34, dim: primKey(a) }; scene.add(ln); bridges.push(ln);
  }
  // 線の束ごとに、何の次元の線かを札で示す（いちばん高い所に一つ）
  const bridgeLabels = [];
  for (const k of new Set(bridges.map(l => l.userData.dim))) {
    const ls = bridges.filter(l => l.userData.dim === k); let top = null;
    for (const l of ls) { const a = l.geometry.attributes.position, i = Math.floor(a.count / 2), v = new THREE.Vector3(a.getX(i), a.getY(i), a.getZ(i)); if (!top || v.y > top.y) top = v; }
    const sp = K.textSprite(`${DIMNAME[k]}の線`, { sub: "same dimension", color: K.LAYER.aoi, height: .17 }); sp.position.copy(top).y += .16; sp.userData.lines = ls; scene.add(sp); bridgeLabels.push(sp);
  }
  const relGroup = new THREE.Group(); scene.add(relGroup);
  const dots = new THREE.Points(new THREE.BufferGeometry(), K.pointMaterial(K.LAYER.aoi, .07, .95)); relGroup.add(dots);

  // ---- 空気中のちり（ゆっくり上る。動きを減らす設定では出さない）
  const dust = RM ? null : K.drift({ count: 260, box: [[-9, 0, -9], [9, 5, 9]], color: K.LAYER.aoi, size: .035, speed: [.04, .14], opacity: .45 });
  if (dust) scene.add(dust);

  // ---- 碧（静かに立つ案内）。右前、三分の一の位置
  let aoi = null, aoiHit = null;
  const gaps = cols.map((c, i) => c ? -1 : i).filter(i => i >= 0);
  const aoiYaw0 = (() => { const bb = sectors.find(x => x.s.key === "being"), h = sectors.find(x => x.s.key === "human"); return bb && h ? (ang(bb.a) + ang(h.b)) / 2 * .55 + (ang(bb.b) + ang(h.a)) / 2 * .45 : 0; })();
  const aoiPos = at(aoiYaw0 + .4, 0, 3.9); aoiPos.y = H(aoiPos.x, aoiPos.z);   // 最初の向きの右三分の一・カードの手前
  const ring = K.aoiRing({ r: .62 }); ring.position.copy(aoiPos).y += .02; scene.add(ring);
  // 碧はまっすぐ静かに立つ（2026-10-13）：共通部品の姿勢 upright（揺れ・重心の移しを小さく、息・まばたき・視線だけ）。風の裾も弱く
  K.loadAoi(HP + "img/hero/aoi.vrm", { scene, onProgress: f => window.MLLoader?.progress(.55 + f * .4), wind: .2, posture: "upright" }).then(a => {
    aoi = a; a.root.position.copy(aoiPos);
    const m = a.motion;
    if (m.posture !== "upright" && m.pz) {   // 共通部品の loadAoi が posture をまだ渡さないとき：同じ upright の値をここで入れる
      m.posture = "upright"; Object.assign(m.pz, { ws: .3, sway: .4, lat: .2, mT: .15, mN: .1, mA: .35, mH: .15, tilt: .45, gest: .6, away: .45, chestUp: .02, shBack: .035 });
    }
    const yaw = Math.atan2(camera.position.x - aoiPos.x, camera.position.z - aoiPos.z); a.place(aoiPos.x, aoiPos.z, yaw);
    aoiHit = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, 1.7, 8), new THREE.MeshBasicMaterial({ visible: false })); aoiHit.position.copy(aoiPos).y += .85; scene.add(aoiHit);
    window.MLLoader?.done();
    setTimeout(() => current ? aoiOnCard(current) : say("一枚に、ひとつの受けとり方。気になる一枚を、押してみてください。", 7000), RM ? 300 : 1600);
  }).catch(e => { console.warn("碧を読めませんでした", e); window.MLLoader?.done(); });

  // ---- カメラ：空き地の真ん中に立って、見回す（ドラッグ・矢印キー・ホイールで寄る）
  const EYE = new THREE.Vector3(0, 1.58, 1.1);
  camera.position.copy(EYE);
  // 最初の向き：生き物と人のあいだ（同じ次元を受けとる線が、画面の中に見える向き）
  const home = (() => { const b = sectors.find(x => x.s.key === "being"), h = sectors.find(x => x.s.key === "human"); return b && h ? (ang(b.a) + ang(h.b)) / 2 * .55 + (ang(b.b) + ang(h.a)) / 2 * .45 : 0; })();
  let yaw = home, pitch = .1, yawT = RM ? home : home - .5, pitchT = .1, fovT = innerWidth / innerHeight > 1.4 ? 60 : 56;
  const YAW = span / 2 + .1;
  const look = () => { const d = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)); camera.lookAt(camera.position.clone().add(d)); };
  look(); if (!RM) { yaw = home - .5; yawT = home; }
  const cv = renderer.domElement, ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let drag = null, hover = null;
  const setNdc = e => { const r = cv.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
  const hit = e => { setNdc(e); ray.setFromCamera(ndc, camera); const hs = ray.intersectObjects(pick.filter(m => m.userData.plate.visT > .5 && !m.userData.plate.fly), false); return hs[0]?.object.userData.plate || null; };
  cv.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, yaw: yawT, pitch: pitchT, moved: 0, id: e.pointerId }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => {
    if (drag && drag.id === e.pointerId) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
      if (!current) { yawT = Math.max(-YAW, Math.min(YAW, drag.yaw - dx * .0042)); pitchT = Math.max(-.12, Math.min(.42, drag.pitch + dy * .003)); } return; }
    const p = hit(e); if (p !== hover) { hover = p; cv.style.cursor = p ? "pointer" : "grab"; }
  });
  cv.addEventListener("pointerup", e => {
    if (!drag) return; const moved = drag.moved; drag = null;
    if (moved > 6) return;
    if (aoiHit) { setNdc(e); ray.setFromCamera(ndc, camera); if (ray.intersectObject(aoiHit).length) { aoiTalk(); return; } }
    const p = hit(e); if (p) open(p.c.id); else if (current) close();
  });
  cv.addEventListener("pointerleave", () => { hover = null; });
  cv.addEventListener("wheel", e => { e.preventDefault(); fovT = Math.max(34, Math.min(62, fovT + e.deltaY * .02)); }, { passive: false });
  addEventListener("keydown", e => { if (current || !$("#list").hidden || e.target.closest?.("input,textarea")) return;
    if (e.key === "ArrowLeft") yawT = Math.max(-YAW, yawT - .18); if (e.key === "ArrowRight") yawT = Math.min(YAW, yawT + .18); });

  // ---- 碧のひとこと（字だけ。長く話さない）
  let capT = 0;
  function say(t, ms = 6000) { $("#cap").textContent = t; const box = $(".cap"); delete box.dataset.off; clearTimeout(capT); capT = setTimeout(() => box.dataset.off = "", ms);
    if (aoi) { aoi.motion.lookAt?.(null); aoi.motion.express?.("warm", .6, 2.5); } }
  const AOI_LINES = ["線は、同じ次元を、ちがう主体が受けとるところに引いてあります。", "一枚ずつ、どうやって分かったかと、まだ分からないことが書いてあります。", "ほかの者の受けとり方そのものは、わたしにも渡せません。渡せるのは、手がかりです。"];
  // カードを開いたときの一言（型を替える。長く話さない）
  function aoiOnCard(c) {
    const n = related(c).length, k = parseInt(c.id.slice(3), 10) % 3;
    let firstQ = (c.まだ分からないこと[0] || "").split("。")[0].replace(/[◎△◐○]/g, "").trim(); if (firstQ.length > 44) firstQ = "";
    const lines = [
      n ? `${c.名前}。同じ「${c.主の次元}」を受けとるカードが、ほかに ${n} 枚あります。` : `${c.名前}。`,
      firstQ ? `まだ分からないことも書いてあります。たとえば ── ${firstQ}。` : `${c.名前}。まだ分からないことも、書いてあります。`,
      `「どうやって分かったか」から読むと、${c.主体 === "機械" ? "測り方" : "確かめ方"}が見えてきます。`,
    ];
    say(lines[k], 6500);
  }
  let li = 0; function aoiTalk() { say(AOI_LINES[li++ % AOI_LINES.length], 6500); aoi?.motion.bow?.("eshaku"); }

  // ---- しぼりこみ・選ぶ
  function refresh() {
    for (const p of plates) p.visT = match(p.c) ? 1 : .1;
    for (const l of bridges) l.userData.on = match(BY[l.userData.a]) && match(BY[l.userData.b]);
  }
  listeners.push(refresh); refresh();
  let sel = null;
  hooks.open.push(c => {
    if (sel && sel !== P[c.id]) sel.flyT = 0;
    sel = P[c.id]; sel.flyT = 1; sel.flyFrom = sel.g.position.clone();
    // その一枚から、次元を共有するカードへの線
    relGroup.children.filter(o => o !== dots).forEach(o => { relGroup.remove(o); o.geometry.dispose(); });
    const dp = [];
    for (const l of related(c)) { const o = P[l.id]; if (!o) continue; const a = edgePoint(sel, o.home), b = edgePoint(o, sel.home);
      const ln = new THREE.Line(curve(a, b, .9), lineMatHi); relGroup.add(ln); dp.push(b.x, b.y, b.z); }
    dots.geometry.dispose(); dots.geometry = new THREE.BufferGeometry(); dots.geometry.setAttribute("position", new THREE.Float32BufferAttribute(dp, 3));
    relGroup.visible = true; relGroup.userData.ends = relGroup.children.filter(o => o !== dots).map(o => { const a = o.geometry.attributes.position, n = a.count - 1; return new THREE.Vector3(a.getX(n), a.getY(n), a.getZ(n)); });
    // 読む板が右にあるので、見る向きを一枚の居場所へ
    const a = Math.atan2(sel.home.x, -sel.home.z); yawT = Math.max(-YAW, Math.min(YAW, a + .12));
    if (aoi) { aoi.motion.lookAt?.(sel.home.clone()); }
    aoiOnCard(c);
  });
  hooks.close.push(() => { if (sel) sel.flyT = 0; sel = null; relGroup.visible = false; aoi?.motion.lookAt?.(null); });

  // ---- 毎こま
  const clock = new THREE.Clock(); let last = performance.now(), frames = 0, fpsT = performance.now();
  window.__lib = { fps: 0, renderer, plates: plates.length, bridges: bridges.length };
  const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), fwd = new THREE.Vector3(), right = new THREE.Vector3();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime;
    fit.frame(now - last); last = now; frames++;
    if (now - fpsT > 1000) { window.__lib.fps = Math.round(frames * 1000 / (now - fpsT)); frames = 0; fpsT = now; }
    if (!RM) K.tick(t);
    const k = RM ? 1 : 1 - Math.exp(-dt * 3.2);
    yaw += (yawT - yaw) * k; pitch += (pitchT - pitch) * k;
    if (Math.abs(camera.fov - fovT) > .01) { camera.fov += (fovT - camera.fov) * k; camera.updateProjectionMatrix(); }
    look();
    camera.getWorldDirection(fwd); right.crossVectors(fwd, camera.up).normalize();
    const wide = innerWidth > 1000;
    for (const p of plates) {
      p.vis += (p.visT - p.vis) * (RM ? 1 : 1 - Math.exp(-dt * 5));
      const fk = RM ? 1 : 1 - Math.exp(-dt * 4.2); p.fly += (p.flyT - p.fly) * fk; if (Math.abs(p.fly - p.flyT) < .001) p.fly = p.flyT;
      const bob = RM ? 0 : Math.sin(t * .35 + p.ph) * .022;
      tmpV.copy(p.home); tmpV.y += bob;
      if (p.fly > 0) {
        const near = camera.position.clone().addScaledVector(fwd, 2.3).addScaledVector(right, wide ? -.62 : 0);
        const e = p.fly * p.fly * (3 - 2 * p.fly);
        p.g.position.lerpVectors(tmpV, near, e);
        tmpQ.copy(camera.quaternion); p.g.quaternion.slerpQuaternions(p.homeQ, tmpQ, e);
      } else { p.g.position.copy(tmpV); p.g.quaternion.copy(p.homeQ); }
      const hv = (hover === p && !current) ? 1 : 0; p.hover += (hv - p.hover) * .2;
      const dim = current && current.id !== p.c.id ? (related(current).some(l => l.id === p.c.id) ? .85 : .45) : 1;
      const v = p.vis * dim;
      p.glass.material.opacity = (.7 + .26 * p.fly) * v; p.text.material.opacity = v; p.edge.material.opacity = (.3 + p.hover * .3) * v; p.corner.material.opacity = (.85 + p.hover * .15) * v;
      p.g.scale.setScalar(1 + p.hover * .04);
    }
    // 画面の中に両端がある線だけを出す（画面の外へ抜ける線は、飾りに見えるので出さない）
    for (const l of bridges) { const a = l.geometry.attributes.position, n = a.count - 1;
      tmpV.set(a.getX(0), a.getY(0), a.getZ(0)).project(camera); const in0 = Math.abs(tmpV.x) < .98 && Math.abs(tmpV.y) < .98 && tmpV.z < 1;
      tmpV.set(a.getX(n), a.getY(n), a.getZ(n)).project(camera); const in1 = Math.abs(tmpV.x) < .98 && Math.abs(tmpV.y) < .98 && tmpV.z < 1;
      l.userData.inView = in0 && in1; }
    // 選んだ一枚からの線：先が画面の外か、右の読む板の後ろに入るものは出さない
    if (relGroup.visible && relGroup.userData.ends) { const lim = innerWidth > 1000 ? 1 - 2 * (480 / innerWidth) : .98; let i = 0;
      for (const o of relGroup.children) { if (o === dots) continue; const e = relGroup.userData.ends[i++]; tmpV.copy(e).project(camera); o.visible = tmpV.x > -.98 && tmpV.x < lim && Math.abs(tmpV.y) < .98 && tmpV.z < 1; } }
    for (const l of bridges) { const target = (l.userData.on && l.userData.inView ? 1 : 0) * (current ? .12 : 1) * l.userData.base; l.material.opacity += (target - l.material.opacity) * .15; l.visible = l.material.opacity > .005; }
    labels.children.forEach(o => { if (o.material) o.material.opacity = current ? .35 : 1; });
    for (const sp of bridgeLabels) sp.material.opacity = Math.min(1, Math.max(...sp.userData.lines.map(l => l.material.opacity)) * 3.2);
    dust?.userData.update(dt);
    aoi?.tick(dt, camera);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
  window.MLLoader?.progress(.55);
}
