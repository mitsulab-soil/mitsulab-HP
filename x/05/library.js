/* mitsulab 共通の部品（library.js）。© 2026 mitsulab. All rights reserved. */

const HP = document.documentElement.dataset.hp || "/";
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const Q = new URLSearchParams(location.search);
const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
const SUBJ_COLOR = { being: "#7fe0b4", human: "#f4aa96", machine: "#b4a2ff" };
const SUBJ_EN = { being: "beings", human: "humans", machine: "machines" };
const MARK = { "◎": "典拠あり", "△": "議論中・諸説", "◐": "近い仲間などの研究から推しはかった", "○": "典拠を確かめていない" };

// モバイルは説明と絞り込みを畳み、3Dの中央を空ける。内容は開いて読める。
const compactView=matchMedia('(max-width:760px)');
// 2026-10-18：PC も絞り込みは最初は畳む（最初の画面の左半分が字の板二枚で、林とカードが後になっていた）。導入はPCでは開いておく
function compactLayout(){document.getElementById('libraryIntro').open=!compactView.matches;document.getElementById('filterTools').open=false;}
compactLayout();compactView.addEventListener('change',compactLayout);
new ResizeObserver(([entry])=>document.body.style.setProperty('--filter-height',entry.target.getBoundingClientRect().height+'px')).observe($('.filters'));

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
  // 2026-10-18：子どもや初めての人がつまずいた語を足した
  ["模式", "本物そのものではなく、しくみや手がかりが分かるように、形を単純にして表したもの。"],
  ["水晶体", "目の中のレンズ。光を曲げて、網膜にピントを合わせる。"],
  ["二色型", "色を受けとる細胞（錐体）が 2 種類ある色の見え方。犬など。"],
  ["四色型", "色を受けとる細胞（錐体）が 4 種類ある色の見え方。多くの鳥など。"],
  ["偽色", "人に見えない光の強さを、人に見える色に置きかえて表した色。その光の本当の色ではない。"],
  ["竪琴状", "クモの脚の関節の近くにある、細い割れ目が竪琴の弦のように並んだ感覚器。脚にかかるわずかなゆがみを受けとる。"],
  ["回旋転頭運動", "植物の茎やつるの先が、ゆっくり円をえがくように回りながら伸びる動き。"],
  ["摩擦音", "体の一部をこすり合わせて出す音。"],
];
// ふりがな：一枚の中で、初めて出る所だけ（読みは辞書で確かめた）
const RUBY = { "受容体": "じゅようたい", "偏光": "へんこう", "錐体": "すいたい", "網膜": "もうまく", "複眼": "ふくがん", "単眼": "たんがん", "油球": "ゆきゅう", "近赤外": "きんせきがい", "周波数": "しゅうはすう", "伏角": "ふっかく", "珪藻": "けいそう", "未較正": "みこうせい", "視蓋": "しがい", "頭部伝達関数": "とうぶでんたつかんすう", "随伴性": "ずいはんせい", "季語": "きご", "模式": "もしき", "回旋転頭運動": "かいせんてんとううんどう", "竪琴状": "たてごとじょう", "偽色": "ぎしょく", "摩擦音": "まさつおん", "二色型": "にしょくがた", "三色型": "さんしょくがた", "四色型": "よんしょくがた", "水晶体": "すいしょうたい", "紫外": "しがい", "地磁気": "ちじき", "泥炭": "でいたん", "遺伝子": "いでんし" };
const RUBY_RE = new RegExp(Object.keys(RUBY).sort((a, b) => b.length - a.length).join("|"), "g");
const ruby = (html, seen) => html.split(/(<[^>]+>)/).map(s => s.startsWith("<") ? s : s.replace(RUBY_RE, w => seen.has(w) ? w : (seen.add(w), `<ruby>${w}<rt>${RUBY[w]}</rt></ruby>`))).join("");
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function fmt(s) {
  let h = esc(s).replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "<i>$1</i>");
  h = h.replace(/https?:\/\/[^\s<）)、。]+/g, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
  h = h.replace(/([◎△◐○])(?=\s|$|。|<)/g, (m, k) => `<span class="mk" title="${MARK[k]}">${k}</span>`);
  return h;
}
$$('[data-name="lead"]').forEach(el => el.innerHTML = esc(NAMES.lead).replace("環世界", "<ruby>環世界<rt>かんせかい</rt></ruby>"));

// ---- たとえば（最初の画面に、一枚の驚きを一行で）
// 2026-10-18：入口の一枚は、知らない人にも身近なものから（専門の語が先に来るクモは外した）
const HOOKS = ["TC-012", "TC-010", "TC-007", "TC-013", "TC-008"].filter(id => BY[id]);
{ const hk = location.hash.slice(1).toLowerCase(), hc = CARDS.find(x => x.key === hk);
  const c = hc || BY[HOOKS[Math.floor(Math.random() * HOOKS.length)]];
  for (const el of $$("[data-hook]")) { el.innerHTML = `<span class="hk">たとえば</span><span class="ht">${ruby(esc(c.一行), new Set())}</span><button class="ml-btn ml-btn--quiet" type="button" data-open="${c.id}">${esc(c.名前)} を読む →</button>`;
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

// ---- 一覧（PC・スマホとも「一覧で見る」、WebGLなし時は主の画面）
function buildList() {
  const html = [];
  for (const s of SUBJS) {
    const cs = CARDS.filter(c => c.主体key === s.key).sort((a, b) => (DIMORDER[primKey(a)] - DIMORDER[primKey(b)]) || a.id.localeCompare(b.id));
    if (!cs.length) continue;
    html.push(`<section class="group" style="--sc:${SUBJ_COLOR[s.key]}"><h2>${esc(s.名前)}<span>${SUBJ_EN[s.key]}</span></h2><ul class="items">`);
    for (const c of cs) html.push(`<li data-id="${c.id}"><button class="item ml-panel" type="button" data-open="${c.id}" style="--sc:${SUBJ_COLOR[s.key]}">
      <span class="ik"><span><b>${esc(c.主の次元)}</b>${c.関わる次元.length ? "　＋" + c.関わる次元.map(esc).join("・") : ""}</span><span><span class="mk" title="${MARK[c.確からしさ]}">${c.確からしさ}</span></span></span>
      <span class="in">${esc(c.名前)}</span><span class="io">${c.やさしく ? `<span class="io-kid">${esc(c.やさしく)}</span>` : ruby(esc(c.一行), new Set())}</span>${c.外でこう見てみる ? `<span class="iw"><b>外で</b>${esc(c.外でこう見てみる.いつ)}</span>` : ""}</button></li>`);
    html.push(`</ul></section>`);
  }
  $("#groups").innerHTML = html.join("");
  $("#groups").addEventListener("click", e => { const b = e.target.closest("[data-open]"); if (b) open(b.dataset.open, { from: "list" }); });
}

// ---- 読む板
let current = null, lastFocus = null;
const hooks = { open: [], close: [] };
function readerHTML(c) {
  const seen = new Set(), F = t => ruby(fmt(t), seen);   // ふりがなは、この一枚の中で初めて出る所だけ
  const sec = (ja, en, items, note = "") => items.length ? `<section class="r-sec"><h3>${ja}<span>${en}</span></h3>${note}<ul>${items.map(t => `<li>${F(t)}</li>`).join("")}</ul></section>` : "";
  const rel = related(c).map(l => ({ c: BY[l.id], dims: l.次元keys.map(k => DIMNAME[k]) })).sort((a, b) => b.dims.length - a.dims.length || a.c.id.localeCompare(b.c.id));
  // 外でこう見てみる（2026-10-13 ミカタ）：読み終えたら、外で確かめる見方を一つ。上に「いつ」の札を出し、押すとそこへ
  const lk = c.外でこう見てみる;
  const lookTop = lk ? `<a class="r-lookchip" href="#r-look" data-jump="r-look"><span>外で</span>${esc(lk.いつ)}<i aria-hidden="true">↓</i></a>` : "";
  const lookSec = () => lk ? `<section class="r-sec r-look" id="r-look"><h3>外でこう見てみる<span>look outside</span></h3><p class="r-when"><span>いつ</span>${esc(lk.いつ)}</p>${lk.見方.map(t => `<p>${F(t)}</p>`).join("")}</section>` : "";
  return `<div class="r-kick"><span style="color:${SUBJ_COLOR[c.主体key]}">${esc(c.主体)} ・ ${esc(c.主の次元)}</span>${c.関わる次元.length ? `<span>関わる次元：${c.関わる次元.map(esc).join("・")}</span>` : ""}<span class="mk" title="${MARK[c.確からしさ]}">${c.確からしさ} ${MARK[c.確からしさ]}</span></div>
    <h2 class="r-name" id="r-name">${esc(c.名前)}</h2>
    ${c.やさしく ? `<p class="r-kid"><span>ひとことで</span>${esc(c.やさしく)}</p>` : ""}
    <p class="r-one">${F(c.一行)}</p>
    ${lookTop}
    <ul class="tags" aria-label="分野">${c.分野.map(f => `<li>${esc(f)}</li>`).join("")}</ul>
    ${sec("仕組み", "how it works", c.仕組み)}
    ${sec("どうやって分かったか", "how we know", c.どうやって分かったか)}
    ${sec("まだ分からないこと", "still open", c.まだ分からないこと)}
    ${sec("人に届く翻訳の案", "a proposed model for people", c.人に届く翻訳, `<p class="r-note">${F("手がかりを、人の目・耳・手に届く形に写す案です。その生き物や人、機械の受けとり方そのものではありません。")}</p>`)}
    ${c.試せる作品.length ? `<section class="r-sec"><h3>作品で試す<span>try it</span></h3><ul class="works">${c.試せる作品.map(w => `<li><a href="${esc(w.url)}" target="_blank" rel="noopener"><span>${esc(w.名前)}<small>${esc(w.一言)}</small></span><span aria-hidden="true">↗</span></a></li>`).join("")}</ul></section>` : ""}
    ${lookSec()}
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
$("#reader").addEventListener("click", e => {
  const j = e.target.closest("[data-jump]"); if (j) { e.preventDefault(); const t = document.getElementById(j.dataset.jump); t?.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" }); t?.setAttribute("tabindex", "-1"); t?.focus({ preventScroll: true }); return; }
  const b = e.target.closest("[data-open]"); if (b) open(b.dataset.open); });
$("#closeReader").addEventListener("click", close);
addEventListener("hashchange", () => { const k = location.hash.slice(1).toLowerCase(), c = CARDS.find(x => x.key === k); if (c && c !== current) open(c.id); });
addEventListener("keydown", e => { if (e.key === "Escape") { if (current) close(); else if (document.body.dataset.mode === "3d" && !$("#list").hidden) showList(false); } });

// ---- 画面の型を決める
function webgl() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } }
const wantList = Q.get("mode") === "list" || !webgl();
buildFilters(); buildList(); applyFilter();
function showList(on) { if(on&&current)close();$("#list").hidden = !on;if(on)document.body.dataset.listOpen="true";else delete document.body.dataset.listOpen;$(".top").inert=on;$(".filters").inert=on; if (on) $("#closeList").focus({ preventScroll: true }); else $("#openList").focus({ preventScroll: true }); }
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
  // 2026-10-18：起動 5 秒。読み込み画面は碧（VRM 約 2 MB）を待たず、林の質感がそろって最初の一こまを描いたら閉じる（碧はあとから立つ）
  const texWait = [];
  const TL = new THREE.TextureLoader(), tx = (f, srgb = true) => { let ok; texWait.push(new Promise(r => ok = r)); const t = TL.load("tex/" + f, ok, undefined, ok); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; return t; };
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
  // 2026-10-18：葉の切り抜きの縁がぎざぎざに見えた → 縁をなめらかに（アプリ側の材質の設定だけ。kit は変えない）
  [leaf, leaf2].forEach(m => { m.alphaToCoverage = true; });
  [leaf.map, leaf2.map].forEach(t => t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping);
  K.plantTrees(nature, trees, { barkMat: { keyaki: bark, konara: barkK, default: bark }, leafMats: { konara: leaf2, keyaki: leaf, default: leaf }, R });
  const grass = K.grassField(nature, R, { count: 5000, area: 20, ok: (x, z) => { const r = Math.hypot(x, z); return r > 1.6 && r < 10; } });
  { const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    for (let i = 0; i < grass.count; i++) { grass.getMatrixAt(i, m4); m4.decompose(p, q, s); p.y = H(p.x, p.z) - .02; m4.compose(p, q, s); grass.setMatrixAt(i, m4); } grass.instanceMatrix.needsUpdate = true; }
  window.MLLoader?.progress(.45);

  // ---- 置き方：主体ごとの弧（左から 生き物・人・機械）、その中で次元ごとの列（一列に 3 枚まで）
  // 2026-10-18：カードの弧を 6.4→5.7 m に寄せた（遠くて板の字が読めなかった）
  const RAD = 5.7, W = .9, Hh = 1.2, ROWS = [1.02, 2.34, 3.66];
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
    x.fillStyle = "rgba(195,204,224,.55)"; x.font = `400 24px ${mono}`; x.textBaseline = "top";   // 番号は出さない（2026-10-18：欠番が見えていた）
    x.textAlign = "right"; x.fillStyle = "rgba(155,220,240,.9)"; x.fillText(c.確からしさ, cw - 44, 46); x.textAlign = "left";
    x.fillStyle = col; x.font = `400 30px ${sans}`; x.fillText(`${c.主体}　・　${c.主の次元}`, 44, 96);
    const wrap = (text, font, lh, maxW, maxL, y0, color, x0 = 44) => { x.font = font; x.fillStyle = color; let line = "", y = y0, n = 0;
      for (const chh of text) { const t = line + chh; if (x.measureText(t).width > maxW && line) { if (++n >= maxL) { x.fillText(line.slice(0, -1) + "…", x0, y); return y + lh; } x.fillText(line, x0, y); y += lh; line = chh; } else line = t; }
      if (line) { x.fillText(line, x0, y); y += lh; } return y; };
    // 2026-10-18：字を大きく（スマホでも板の題が読めるように）
    // スマホ（狭い画面）は板が小さく写るので、題をさらに大きくし、一行の文は板に載せない（開けば読める）
    const big = compactView.matches;
    let y = wrap(c.名前, serif.replace("52px", big ? "86px" : "70px"), big ? 104 : 88, cw - 88, big ? 4 : 3, 150, "#eef5fb");
    x.fillStyle = "rgba(150,170,240,.35)"; x.fillRect(44, y + 18, 80, 2);
    if (!big) y = wrap(c.一行, `400 33px ${sans}`, 50, cw - 88, Math.max(1, Math.floor((ch - 220 - (y + 44)) / 50)), y + 44, "rgba(195,204,224,.92)");
    // 板の下に「外で：いつ」（2026-10-13：開く前から、外へ出る図鑑だと分かるように）
    if (c.外でこう見てみる) { const ly = ch - 196; x.fillStyle = "rgba(127,200,230,.5)"; x.fillRect(44, ly - 4, 2, 92);
      x.fillStyle = "rgba(127,200,230,.95)"; x.font = `400 ${big ? 30 : 25}px ${mono}`; x.fillText("外で", 62, ly);
      wrap(c.外でこう見てみる.いつ, `400 ${big ? 36 : 30}px ${sans}`, big ? 44 : 40, cw - 110, 2, ly + (big ? 38 : 34), "#e4eef6", 62); }
    if (!big) x.fillStyle = "rgba(143,155,180,.85)", x.font = `400 24px ${mono}`, x.fillText(c.分野.join("  ·  "), 44, ch - 72);
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
  const subjLabels = [];
  for (const sc of sectors) {
    const a0 = ang(sc.a) - STEP * .45, a1 = ang(sc.b) + STEP * .45, mid = (a0 + a1) / 2, col = new THREE.Color(SUBJ_COLOR[sc.s.key]).getHex();
    const sp = K.textSprite(sc.s.名前, { sub: SUBJ_EN[sc.s.key], color: col, height: .34 }); sp.position.copy(at(mid, 3.86)); labels.add(sp);
    subjLabels.push({ sp, a0, a1, mid, cur: mid, tgt: mid });
    const arc = []; for (let k = 0; k < 40; k++) { const u = a0 + (a1 - a0) * k / 39, v = at(u, 0, RAD + .15); arc.push(v.x, H(v.x, v.z) + .04, v.z); }
    const ag = new THREE.BufferGeometry(); ag.setAttribute("position", new THREE.Float32BufferAttribute(arc, 3)); labels.add(new THREE.Line(ag, K.lineMaterial(col, .55)));
  }
  cols.forEach((col, i) => { if (!col || !col.first) return; const n = cols.filter(c => c && c.subj === col.subj && c.dim === col.dim).length;
    const sp = K.textSprite(DIMNAME[col.dim], { color: K.LAYER.aoi, height: .2 }); sp.position.copy(at(ang(i) + STEP * (n - 1) / 2, .46, RAD - .05)); labels.add(sp); });

  // 主体の札は、弧の上の「画面の板（導入・しぼりこみ・読む板）に隠れない所」へ寄せる（2026-10-13・P2：導入の板が「生き物」を隠していた）
  const UI_BOXES = [".brand", ".filters", ".acts", "#reader"];
  function placeSubjLabels() {
    const boxes = UI_BOXES.map(s => $(s)).filter(el => el && !el.hidden && getComputedStyle(el).display !== "none" && +getComputedStyle(el).opacity > .3).map(el => el.getBoundingClientRect());
    const W0 = innerWidth, H0 = innerHeight, mx = 64, my = 30, v = new THREE.Vector3();
    for (const L of subjLabels) {
      let best = null, bestD = 1e9;
      for (let k = 0; k <= 24; k++) {
        const u = L.a0 + (L.a1 - L.a0) * k / 24; v.copy(at(u, 3.86)).project(camera); if (v.z > 1) continue;
        const x = (v.x + 1) / 2 * W0, y = (1 - v.y) / 2 * H0;
        if (x < mx || x > W0 - mx || y < my || y > H0 - my) continue;
        if (boxes.some(b => x + mx > b.left && x - mx < b.right && y + my > b.top && y - my < b.bottom)) continue;
        const dd = Math.abs(u - L.mid); if (dd < bestD) { bestD = dd; best = u; }
      }
      L.tgt = best ?? L.mid;
    }
  }
  let frameN = 0;

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
  // 2026-10-18：縦長のスマホでは、右へ寄せすぎると碧が画面の外に出ていた。縦の画面では内へ寄せて手前に立つ
  const aoiPos = compactView.matches ? at(aoiYaw0 + .14, 0, 3.3) : at(aoiYaw0 + .4, 0, 3.9); aoiPos.y = H(aoiPos.x, aoiPos.z);   // 最初の向きの右三分の一・カードの手前
  const ring = K.aoiRing({ r: .62 }); ring.position.copy(aoiPos).y += .02; scene.add(ring);
  // 碧はまっすぐ静かに立つ（2026-10-13）：共通部品の姿勢 upright（揺れ・重心の移しを小さく、息・まばたき・視線だけ）。風の裾も弱く
  K.loadAoi(HP + "img/hero/aoi.vrm", { scene, onProgress: f => window.MLLoader?.progress(.55 + f * .4), wind: .2, posture: "upright" }).then(a => {
    aoi = a; a.root.position.copy(aoiPos);
    const m = a.motion;
    if (m.posture !== "upright" && m.pz) {   // 共通部品の loadAoi が posture をまだ渡さないとき：同じ upright の値をここで入れる
      m.posture = "upright"; Object.assign(m.pz, { ws: .3, sway: .4, lat: .2, mT: .15, mN: .1, mA: .35, mH: .15, tilt: .45, gest: .6, away: .45, chestUp: .02, shBack: .035 });
    }
    m.groundAt = H;   // 空き地のゆるい起伏に足を合わせる（読む板の横へ歩くため）
    const yaw = Math.atan2(camera.position.x - aoiPos.x, camera.position.z - aoiPos.z); a.place(aoiPos.x, aoiPos.z, yaw);
    aoiHit = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, 1.7, 8), new THREE.MeshBasicMaterial({ visible: false })); aoiHit.position.copy(aoiPos).y += .85; scene.add(aoiHit);
    window.MLLoader?.done();
    if (current) aoiAside(current);
    setTimeout(() => current ? aoiOnCard(current) : say("一枚に、ひとつの受けとり方。\n気になる一枚を、押してみてください。", 7000), RM ? 300 : 1600);
  }).catch(e => { console.warn("碧を読めませんでした", e); window.MLLoader?.done(); });

  // ---- カメラ：空き地の真ん中に立って、見回す（ドラッグ・矢印キー・ホイールで寄る）
  // 縦長の画面は少し後ろに立って広く見る（2026-10-18：スマホの最初の画面で、全部見えるカードが 1 枚だけだった）
  const portrait = innerWidth / innerHeight < .8;
  const EYE = new THREE.Vector3(0, 1.58, portrait ? 2.1 : 1.1);
  camera.position.copy(EYE);
  // 最初の向き：生き物と人のあいだ（同じ次元を受けとる線が、画面の中に見える向き）
  const home = (() => { const b = sectors.find(x => x.s.key === "being"), h = sectors.find(x => x.s.key === "human"); return b && h ? (ang(b.a) + ang(h.b)) / 2 * .55 + (ang(b.b) + ang(h.a)) / 2 * .45 : 0; })();
  let yaw = home, pitch = .1, yawT = RM ? home : home - .5, pitchT = .1, fovT = innerWidth / innerHeight > 1.4 ? 60 : portrait ? 64 : 56;
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
  const AOI_LINES = ["線は、同じ次元を、ちがう主体が受けとるところに引いてあります。", "一枚ずつ、どうやって分かったかと、まだ分からないことが書いてあります。", "ほかの生き物や人の受けとり方そのものは、わたしにも渡せません。渡せるのは、手がかりです。"];
  // カードを開いたときの一言（型を替える。長く話さない）
  function aoiOnCard(c) {
    const n = related(c).length, k = parseInt(c.id.slice(3), 10) % 4;
    const out = c.外でこう見てみる ? `外でこう見てみる ── ${c.外でこう見てみる.いつ}。読み終えたら、いちばん下の、外で確かめる見方へ。` : "";
    if (out && (k === 1 || k === 3 || !opened++)) { say(out, 7000); return; }
    let firstQ = (c.まだ分からないこと[0] || "").split("。")[0].replace(/[◎△◐○]/g, "").trim(); if (firstQ.length > 44) firstQ = "";
    const lines = [
      n ? `${c.名前}。同じ「${c.主の次元}」を受けとるカードが、ほかに ${n} 枚あります。` : `${c.名前}。`,
      firstQ ? `まだ分からないことも書いてあります。たとえば ── ${firstQ}。` : `${c.名前}。まだ分からないことも、書いてあります。`,
      `「どうやって分かったか」から読むと、${c.主体 === "機械" ? "測り方" : "確かめ方"}が見えてきます。`,
    ];
    say(lines[k % 3], 6500);
  }
  let opened = 0;
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
    if (aoi) { aoi.motion.lookAt?.(sel.g); aoiAside(c); }
    aoiOnCard(c);
  });
  // 閉じたら、その一枚の話（字幕）も消す（2026-10-18：閉じたあとも別のカードの「外で」が残っていた）
  hooks.close.push(() => { if (sel) sel.flyT = 0; sel = null; relGroup.visible = false; aoi?.motion.lookAt?.(null); aoiHome(); clearTimeout(capT); $(".cap").dataset.off = ""; });
  // PC：最初に林を触るか一枚を開いたら、導入の板を畳む（左上の段のカードを隠していた）
  const foldIntro = () => { const d = $("#libraryIntro"); if (d.open && !compactView.matches) d.open = false; };
  cv.addEventListener("pointerdown", foldIntro, { once: true }); hooks.open.push(foldIntro);
  // 読む板を開いたら、碧は板の後ろに入らないよう、手前のカードの左へ歩いて行く（2026-10-13・P2）。閉じたら元の場所へ
  function aoiAside() {
    if (!aoi) return;
    const y = yawT, d = 4, half = d * Math.tan(THREE.MathUtils.degToRad(fovT / 2)) * camera.aspect, tn = Math.tan(THREE.MathUtils.degToRad(fovT / 2)) * camera.aspect;
    // 広い画面＝手前に来たカード（右の縁）と読む板（左の縁）のあいだ。歩く道が短く、カードの後ろを通らない。狭い画面＝左
    const cardR = (-.62 + W / 2) / (2.3 * tn), readL = $("#reader").getBoundingClientRect().left / innerWidth * 2 - 1;
    const nx = innerWidth > 1000 && readL - cardR > .12 ? (cardR + readL) / 2 : -.78;
    const p = new THREE.Vector3(EYE.x, 0, EYE.z).addScaledVector(new THREE.Vector3(Math.sin(y), 0, -Math.cos(y)), d).addScaledVector(new THREE.Vector3(Math.cos(y), 0, Math.sin(y)), nx * half);
    const rr = Math.hypot(p.x, p.z); if (rr > RAD - .8) p.multiplyScalar((RAD - .8) / rr);
    // 遠いときは、読む板の陰（右）から歩き出す（見えない所を長く歩かせない。出てくるまで 1 秒ほど）
    const q = aoi.motion.pos;
    if (!RM && innerWidth > 1000 && q && Math.hypot(q.x - p.x, q.z - p.z) > 2.2) {
      const s = p.clone().addScaledVector(new THREE.Vector3(Math.cos(y), 0, Math.sin(y)), 1.3); aoi.place(s.x, s.z, Math.atan2(p.x - s.x, p.z - s.z));
    }
    aoiGo(p);
  }
  function aoiHome() { if (aoi) aoiGo(aoiPos); }
  function aoiGo(p) {
    if (RM) aoi.place(p.x, p.z, Math.atan2(EYE.x - p.x, EYE.z - p.z)); else aoi.walkTo(p);
    aoi.motion.faceTo?.(null);
  }

  // ---- 毎こま
  const clock = new THREE.Clock(); let last = performance.now(), nextFrame=performance.now(), frames = 0, fpsT = performance.now();
  window.__lib = { fps: 0, renderer, plates: plates.length, bridges: bridges.length, get view(){return{yaw,pitch};},get visiblePlates(){return plates.filter(p=>p.visT>.5).length;},get cardPoints(){return plates.filter(p=>p.visT>.5).map(p=>{const v=p.g.getWorldPosition(new THREE.Vector3()).project(camera);return{id:p.c.id,x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2,z:v.z};});} };
  const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), fwd = new THREE.Vector3(), right = new THREE.Vector3();
  function frame(now) {
    requestAnimationFrame(frame);
    if(document.hidden||document.body.hasAttribute("data-list-open")){clock.getDelta();nextFrame=now;last=now;return;}
    const delta=now-nextFrame;if(delta<1000/30-.3)return;nextFrame=now-delta%(1000/30);
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
    for (const L of subjLabels) if (Math.abs(L.tgt - L.cur) > 1e-4) { L.cur += (L.tgt - L.cur) * (RM ? 1 : 1 - Math.exp(-dt * 4)); L.sp.position.copy(at(L.cur, 3.86)); }
    for (const sp of bridgeLabels) sp.material.opacity = Math.min(1, Math.max(...sp.userData.lines.map(l => l.material.opacity)) * 3.2);
    dust?.userData.update(dt);
    aoi?.tick(dt, camera);
    if (aoi && aoi.motion.pos) { const q = aoi.motion.pos; ring.position.set(q.x, H(q.x, q.z) + .02, q.z); aoiHit?.position.set(q.x, H(q.x, q.z) + .85, q.z); }
    if (!(frameN++ % 12)) placeSubjLabels();
    renderer.render(scene, camera);
    if (texDone && !shown) { shown = true; window.MLLoader?.done(); }
  }
  let texDone = false, shown = false;
  Promise.race([Promise.all(texWait), new Promise(r => setTimeout(r, 1500))]).then(() => texDone = true);
  requestAnimationFrame(frame);
  window.MLLoader?.progress(.55);
}
