/* © mitsulab. 拡張可能な環世界 ── 受けとり方の束（umwelt profile）の型と、はじめの束（2026-11-02 試作・未公開）
   設計＝01_経営/01_経営/03_資料/設計_変身と拡張可能な環世界_2026-11-02.md
   一つの束＝一つの主体の環世界 1.0 の「模式」。HP の式 Q = h(g(E, B), K) の B（身体）と K（その主体の文脈）にあたる。
   束を一つ足せば、新しい生き物・機械が加わる（機械は Qualia と呼ばず「受けとり方」）。
   数は出典で確かめた幅だけ。画面にはいつも「模式」と添える（ほかの主体の感じそのものは渡せない）。
   Wikipedia は出典にしない。 */
export const PROFILE_SCHEMA = 1;
/* 型（すべての項目は任意。なければ人の値のまま）
   id, version, kind: "creature" | "machine", name, call: "Qualia" | "受けとり方"
   body:   { eye: 目の高さ m, scale: 人を 1 とした身体の大きさ }
   sight:  { fov: 画面の画角の模式 °, lens: umwelt_lens.js の LENS の鍵, uv: 紫外の重ね 0..1, edge: 周辺を淡くする 0..1 }
   tempo:  { cff: ちらつきを分ける上限 Hz（人 ≈ 60）, move: 動きの速さの倍率 }
   hearing:{ lo, hi: Hz, map: "そのまま" | "聴こえる高さに移した模式" }
   smell:  { trails: bool, note }
   salient: [ 目立つもの ], ignored: [ 取りこぼすもの ]
   question: 碧が置く問い（一つ。答えは言わない）
   sources: [ { claim, cite } ]  confidence: "高" | "中" | "低"  label: 画面に出す模式の札 */
export const PROFILES = {
  hito: { id: "hito", version: 1, kind: "creature", name: "人", call: "Qualia",
    body: { eye: 1.55, scale: 1 }, sight: { fov: null, lens: "hito", uv: 0, edge: 0 }, tempo: { cff: 60, move: 1 },
    hearing: { lo: 20, hi: 20000, map: "そのまま" }, sources: [], confidence: "高", label: "" },
  hiyodori: { id: "hiyodori", version: 1, kind: "creature", name: "ヒヨドリ", call: "Qualia",
    body: { eye: 4.2, scale: .18 },
    sight: { fov: 96, lens: "tori", uv: .55, edge: .55 },
    tempo: { cff: 100, move: 1 },
    hearing: { lo: 200, hi: 8000, map: "そのまま" },
    salient: ["木の実の色（紫外を返す実の皮）", "動くもの", "枝のつながり"],
    ignored: ["人の文字・看板の意味", "低い音の細部"],
    question: "この枝の高さから、さっきの道はどう見える？",
    sources: [
      { claim: "多くの鳥は紫外に感じる錐体を含む四色型", cite: "Hart NS (2001) Prog. Retin. Eye Res. 20:675–703" },
      { claim: "目が横につく鳥は視野が広く、正面の両眼視は狭い", cite: "Martin GR (2007) J. Ornithol. 148:S547–S562" },
      { claim: "小鳥の時間の解像度は人より高い（マダラヒタキで約 146 Hz）", cite: "Boström JE et al. (2016) PLoS ONE 11:e0166345" },
      { claim: "鳥のよく聴こえる帯はおよそ 1〜4 kHz", cite: "Dooling RJ (1982) in Kroodsma & Miller eds. Acoustic Communication in Birds, Academic Press" },
      { claim: "ヒヨドリは大宮公園で記録がある（2012〜2024 年に 26 件・商用可の条件の記録）", cite: "GBIF.org 出現記録 Hypsipetes amaurotis（大宮公園の範囲・主に eBird）＝アプリのデータ r_nat_01" } ],
    field: { ok: true },
    confidence: "中",
    label: "鳥の受けとり方に寄せた模式（人に見えない光〔紫外〕は紫の光に置きかえ・画角は人の画面に入る幅まで）",
    body3d: { glb: "envAgents/yorishiro/tori.glb", size: .36 }, yori: "tori",
    motion: { kind: "perch", r: [3, 6], h: [3.2, 5], dwell: [2.2, 4.5], dart: .55 } },
  hachi: { id: "hachi", version: 1, kind: "creature", name: "ミツバチ", call: "Qualia",
    body: { eye: 1.0, scale: .01 },
    sight: { fov: 104, lens: "hachi", mix: .55, uv: .8, edge: .4 },   // mix：色の置きかえは半分ほど（全部では画面が黄一色になり景色が読めない）。11-03 P2：0 では人の目と見分けがつかなかった
    tempo: { cff: 200, move: 1 },
    hearing: { lo: 0, hi: 0, map: "空気の音より、ふるえ（振動）として受けとる模式" },
    salient: ["花の紫外の模様（蜜のありか）", "動くもの・明暗のちらつき", "太陽の向きと空の偏光"],
    ignored: ["赤（黒っぽく見える）", "遠くの細部（目の細かさは人より粗い）"],
    question: "花の色は、ハチにとっても同じ色？",
    sources: [
      { claim: "ミツバチの受けとる細胞は紫外・青・緑の三種類（約 340・435・540 nm）", cite: "Peitsch D et al. (1992) J. Comp. Physiol. A 170:23–40" },
      { claim: "働き蜂の複眼の視野はほぼ全周に近く広い", cite: "Seidl R & Kaiser W (1981) J. Comp. Physiol. 143:17–26" },
      { claim: "ちらつきを分ける上限は人より高い（約 200 Hz 前後とされる）", cite: "Srinivasan MV & Lehrer M (1984) J. Comp. Physiol. A 155:297–312（数値は要再確認）" },
      { claim: "空気の音は触角のジョンストン器官などで受け、ふるえで伝え合う", cite: "Dreller C & Kirchner WH (1993) J. Comp. Physiol. A 173:275–279" },
      { claim: "大宮で見られる", cite: "上原光瑛（mitsulab）の現地での観察（2026-11-02 本人の記録）。GBIF の大宮公園の範囲の商用可の記録は 0 件" } ],
    field: { ok: true },
    confidence: "中",
    label: "ミツバチの受けとり方に寄せた模式（人に見えない光〔紫外〕→青・青→緑・緑→赤に置きかえ・画角は人の画面に入る幅まで）",
    body3d: { glb: "envAgents/yorishiro/mitsubachi.glb", size: .2 }, yori: "mitsubachi",
    motion: { kind: "hover", r: [1.8, 3.2], h: [.6, 1.6], speed: 1.6 } },
  suzume: { id: "suzume", version: 1, kind: "creature", name: "スズメ", call: "Qualia",
    body: { eye: .12, scale: .14 },
    sight: { fov: 96, lens: "tori", uv: .5, edge: .55 },
    tempo: { cff: 100, move: 1 },
    hearing: { lo: 200, hi: 8000, map: "そのまま" },
    salient: ["地面の種や虫", "上から来る影"], ignored: ["人の文字・看板の意味"],
    question: "地面すれすれの高さから、碧はどれくらい大きく見える？",
    motion: { kind: "hop", r: [2, 3.4], h: [.12, .12], dwell: [.4, 1.2], dart: .18 },
    sources: [
      { claim: "多くの鳥は紫外に感じる錐体を含む四色型", cite: "Hart NS (2001) Prog. Retin. Eye Res. 20:675–703" },
      { claim: "スズメは大宮公園で記録がある（商用可 CC BY 4.0 の記録 25 件）", cite: "GBIF.org 出現記録 Passer montanus（北緯 35.915〜35.923・東経 139.630〜139.640）2026-11-02 に確かめた" } ],
    confidence: "中", field: { ok: true },
    label: "スズメの受けとり方に寄せた模式（人に見えない光〔紫外〕は紫の光に置きかえ）",
    body3d: { glb: "envAgents/yorishiro/suzume.glb", size: .14 }, yori: "suzume" },
  tanuki: { id: "tanuki", version: 1, kind: "creature", name: "タヌキ", call: "Qualia",
    body: { eye: .32, scale: .5 },
    sight: { fov: 80, lens: "inu", uv: 0, edge: .9, mix: .95 },   // 夜の暗さは周辺だけ（碧に重ねない）
    tempo: { cff: 60, move: 1 },
    hearing: { lo: 0, hi: 0, map: "未確認（数を出さない）" },
    smell: { trails: false, note: "嗅覚が中心とされるが、匂いの道筋は出典がそろうまで描かない" },
    salient: ["地面の匂い", "暗がりの動き"], ignored: ["赤と緑の違い"],
    question: "夜の参道は、低いところからどんなふうに見える？",
    motion: { kind: "hop", r: [2.2, 3.6], h: [.32, .32], dwell: [1.2, 3], dart: .9 },
    sources: [
      { claim: "イヌ科の多くは二色型の色覚", cite: "Jacobs GH (1993) Biol. Rev. 68:413–471" },
      { claim: "タヌキは主に夜に活動する", cite: "環境省 自然環境局 生物多様性センター『日本の哺乳類』の解説ほか（要再確認）" },
      { claim: "大宮で見られる", cite: "上原光瑛（mitsulab）の現地での観察（2026-11-02 本人の記録）" } ],
    confidence: "低", field: { ok: true },
    label: "タヌキの受けとり方に寄せた模式（二色型の色・夜の暗さ）",
    body3d: { glb: "envAgents/yorishiro/tanuki.glb", size: .38 }, yori: "tanuki" },
  /* 石＝生き物ではないので Qualia とも「受けとり方」とも呼ばない。見るのは「石の時間の尺度」の模式（石が感じる・語るとは書かない）。
     timescale＝束の型の「時間の尺度」の項（拡張の一例）。entries の中身はアプリのデータ（data.json の objs）の id を引く＝一次の出典はそちらに付いている。
     確かめられない時代は入れない。昔の姿の 3D はまだ出さない（札と色の模式だけ）。 */
  ishi: { id: "ishi", version: 1, kind: "matter", name: "石", call: "時間の尺度",
    body: { eye: .22, scale: .2 },
    sight: { fov: 70, lens: "ishi", uv: 0, edge: .6 },   // 11-03 P2：石は目を持たない＝色を淡くした時間の模式
    motion: { kind: "still", r: [1.1, 1.1], h: [.22, .22] },
    timescale: { kind: "deep", step: 3.6, entries: [
      { when: "大正 12・昭和 9", id: "d_quake", re: "関東大震災" },
      { when: "1885", id: "x_hikawakoen", re: "明治18" },
      { when: "1871", id: "x_kanpei", re: "明治4" },
      { when: "1629", id: "x_minumatamei", re: "寛永6" },
      { when: "1628", id: "s_s_nakasendo", re: "寛永 ?5" },
      { when: "縄文", id: "x_joumon", re: "縄文" },
      { when: "ローム", id: "s_dw_s3", re: "火山灰" },
      { when: "12〜13 万年前", id: "s_dw_s2", re: "万年", tint: "sea" } ] },
    question: "いま歩いた道は、どの時代の道の上にある？",
    sources: [ { claim: "各年代の中身", cite: "アプリのデータの各項目の出典（氷川神社「由緒・歴史」・埼玉県 大宮公園「大宮公園の歴史」・国土交通省『土地分類基本調査（土地履歴調査）説明書「大宮」』2012 ほか）" } ],
    confidence: "高",
    label: "石の時間の尺度に寄せた模式（時間をさかのぼる・昔の色は模式）",
    body3d: { glb: "envAgents/yorishiro/ishi.glb", size: .3 }, yori: "ishi" },
  /* 木＝ケヤキ（氷川参道の並木の主な樹種）。生き物だが、見る人の視点を置くのは「木の中を通る物の流れ」＝循環の模式。
     cycle＝束の型の「循環」の項（拡張の一例）。流れごとに、向き・色・時間の縮め方・出典。数は教科書の幅だけ・「およそ」で。
     速さは、そのままでは目に見えないので時間を縮めて見せる（倍率を札に書く）。出典の確かめが済まない流れは hold で出さない。 */
  ki: { id: "ki", version: 1, kind: "creature", name: "木", call: "循環",
    body: { eye: 1.7, scale: 10 },
    sight: { fov: 66, lens: "hito", uv: 0, edge: .3 },
    motion: { kind: "tree", species: "keyaki" },
    cycle: { speedup: 600, flows: [
      { id: "water", dir: "up", color: 0x7fa8c4, n: 110, label: "水と無機養分：根から木部を上がる（ケヤキは環孔材で、日中は速い）",
        num: "木部の流れの速さはおよそ 1〜数十 m/時（樹種・時刻で大きく変わる）", cite: "Taiz L, Zeiger E et al. Plant Physiology and Development 6th ed. (2015) Sinauer, Ch.6" },
      { id: "transp", dir: "out", color: 0xaebfcc, n: 40, sun: true, label: "蒸散：吸った水の大部分は葉の気孔から水蒸気で出る",
        num: "吸った水のおよそ 9 割以上が蒸散で出るとされる", cite: "Taiz & Zeiger (2015) Ch.4" },
      { id: "photo", dir: "in", color: 0x8fae78, n: 36, sun: true, label: "光合成：葉が CO₂ を取りこみ O₂ を出す（日が高いほど強く、夜は止まる）",
        num: "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂（光のエネルギー）", cite: "Taiz & Zeiger (2015) Ch.7–8" },
      { id: "sugar", dir: "down", color: 0xb08e55, n: 70, label: "糖：葉でつくられ、師部を通って幹や根へ下る",
        num: "師部の流れはおよそ 0.5〜1 m/時", cite: "Taiz & Zeiger (2015) Ch.11" },
      { id: "litter", dir: "fall", color: 0xa88d68, n: 14, months: [10, 11, 12], label: "落葉：秋に葉を落とし、土の生き物に分解されて土へ還る",
        num: "", cite: "Taiz & Zeiger (2015)・土壌生物の教科書（要確かめ）" },
      { id: "pollen", dir: "wind", color: 0xeee6c4, n: 30, months: [4], hold: true, label: "花粉：ケヤキは春に咲き、花粉は風で運ばれる",
        num: "", cite: "一次の出典を確かめ中（確かめが済むまで出さない）" } ] },
    question: "この葉から出ていった水は、次にどこへ行く？",
    sources: [ { claim: "流れごとの数と仕組み", cite: "Taiz L, Zeiger E, Møller IM, Murphy A (2015) Plant Physiology and Development 6th ed., Sinauer" },
      { claim: "氷川参道の並木にケヤキがある", cite: "さいたま市「文化財紹介 氷川参道の並木」さいたま市教育委員会" } ],
    confidence: "中",
    label: "木の中を通る物の流れの模式（時間を約 600 倍に縮めて表示・色は区別のための淡い色）",
    body3d: { glb: "envAgents/yorishiro/ki.glb", size: .8 }, yori: "ki" },
};
export function addProfile(p) {   // 束を落とせば加わる：最低限の確かめ
  if (!p || !p.id || !p.name || !Array.isArray(p.sources) || !p.sources.length || !p.label) throw new Error("profile: id・name・sources・label が要る");
  if (p.sources.some(s => /wikipedia/i.test(s.cite || ""))) throw new Error("profile: Wikipedia は出典にしない");
  if (p.kind === "machine") p.call = "受けとり方";
  PROFILES[p.id] = p; return p;
}
