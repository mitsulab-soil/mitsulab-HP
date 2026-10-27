/* Qualium 渋谷 ── 町に置く音の表（川越の sounds.js の作りを写した）
   区分：else＝② ほかの場所で録った同じ種類の音（録音地を出す）。渋谷で録った音（①）はまだない
   at：{ x, z }（原点＝忠犬ハチ公像・東 m・南 m）。amb：近づくと鳴る（r＝半径 m・every＝秒・bed＝ずっと）
   記録の数＝iNaturalist 研究用の質・中心 35.662N 139.700E 半径 1.5 km（2026-10-26 に数えた） */
const C = (t, u) => ({ t, u }), CM = f => "https://commons.wikimedia.org/wiki/File:" + f;
const INAT = (sp, ja) => C(`iNaturalist の記録（${ja}・渋谷駅の北から半径 1.5 km・研究用の質。2026-10-26 に数えた）`, `https://www.inaturalist.org/observations?lat=35.662&lng=139.7&radius=1.5&quality_grade=research&taxon_name=${encodeURIComponent(sp)}`);
export const SPOTS = [
  { id: "n_karasu", cat: "nature", kind: "else", title: "ハシブトガラスの声", at: { x: 60, z: -150 }, f: "web/snd/karasu.m4a", amb: { r: 40, every: 30, hours: [5, 18] },
    label: "② ほかの場所で録った同じ種類の音（ハシブトガラス。記録の場所：Heirinji, Japan〈埼玉県新座市の平林寺とみられる〉）", who: "Zeimusu／Wikimedia Commons（CC BY-SA 2.5）",
    how: "このあたりの鳥の記録でいちばん多いのがハシブトガラス（266 件）。鳴らしているのは、同じ種をほかの場所で録った声です。",
    src: [INAT("Corvus macrorhynchos", "ハシブトガラス 266 件"), C("Corvus macrorhynchos 2005-07-10.ogg / Zeimusu / Wikimedia Commons（CC BY-SA 2.5）", CM("Corvus_macrorhynchos_2005-07-10.ogg"))] },
  { id: "n_kijibato", cat: "nature", kind: "else", title: "キジバトの声", at: { x: 120, z: -320 }, f: "web/snd/kijibato.m4a", amb: { r: 34, every: 26, hours: [5, 18] },
    label: "② ほかの場所で録った同じ種類の音（キジバト。録音地の記載なし）", who: "boppochan／Wikimedia Commons（CC BY-SA 3.0）",
    how: "このあたりのキジバトの記録は 103 件。宮下公園のそばに、同じ種をほかの場所で録った声を置きました（ここにいたという記録ではありません）。",
    src: [INAT("Streptopelia orientalis", "キジバト 103 件"), C("Streptopelia orientalis.ogg / boppochan / Wikimedia Commons（CC BY-SA 3.0）", CM("Streptopelia_orientalis.ogg"))] },
  { id: "n_hakusekirei", cat: "nature", kind: "else", title: "ハクセキレイの声", at: { x: -20, z: -10 }, f: "web/snd/hakusekirei.m4a", amb: { r: 30, every: 24, hours: [5, 18] },
    label: "② ほかの場所で録った同じ種類の音（ハクセキレイと同じ種 Motacilla alba の別の亜種。スイス・イヴェルドン＝レ＝バンで録音）", who: "Pascal Christe／xeno-canto／Wikimedia Commons（CC BY-SA 4.0）",
    how: "このあたりのハクセキレイの記録は 41 件。日本のハクセキレイは亜種 lugens で、鳴らしているのはヨーロッパの別の亜種の声です。",
    src: [INAT("Motacilla alba", "ハクセキレイ 41 件"), C("Motacilla alba - White Wagtail XC466458 / Pascal Christe / Wikimedia Commons（CC BY-SA 4.0）", CM("Motacilla_alba_-_White_Wagtail_XC466458.mp3"))] },
  { id: "n_hiyodori", cat: "nature", kind: "else", title: "ヒヨドリの声", at: { x: 480, z: 140 }, f: "web/snd/hiyodori.m4a", amb: { r: 36, every: 18, hours: [5, 18] },
    label: "② ほかの場所で録った同じ種類の音（ヒヨドリ。静岡県伊豆市で録音）", who: "karliatje／iNaturalist／Wikimedia Commons（CC BY 4.0）",
    how: "このあたりのヒヨドリの記録は 93 件。金王八幡宮の木のそばに、同じ種を伊豆で録った声を置きました（ここにいたという記録ではありません）。",
    src: [INAT("Hypsipetes amaurotis", "ヒヨドリ 93 件"), C("Hypsipetes-amaurotis-2025-05-20-282617142.ogg / karliatje / Wikimedia Commons（CC BY 4.0）", CM("Hypsipetes-amaurotis-2025-05-20-282617142.ogg"))] },
  { id: "n_suzume", cat: "nature", kind: "else", title: "スズメの声", at: { x: -300, z: 110 }, f: "web/snd/suzume.m4a", amb: { r: 26, every: 20, hours: [5, 18] },
    label: "② ほかの場所で録った同じ種類の音（スズメ。フィリピン・ネグロス・オクシデンタル州で録音）", who: "Derek Paulo／xeno-canto／Wikimedia Commons（CC BY-SA 4.0）",
    how: "このあたりのスズメの記録は 61 件。同じ種（Passer montanus）を、ほかの場所で録った声です。",
    src: [INAT("Passer montanus", "スズメ 61 件"), C("Passer montanus - Eurasian Tree Sparrow XC347807 / Derek Paulo / Wikimedia Commons（CC BY-SA 4.0）", CM("Passer_montanus_-_Eurasian_Tree_Sparrow_XC347807.mp3"))] },
  { id: "n_aburazemi", cat: "nature", kind: "else", title: "アブラゼミ（夏）", at: { x: -300, z: -1050 }, f: "web/snd/aburazemi.m4a", amb: { r: 40, bed: true, months: [7, 8, 9], hours: [6, 18] },
    label: "② ほかの場所で録った同じ種類の音（アブラゼミ。日本で録音）", who: "Cory／Wikimedia Commons（CC BY 2.1 JP）",
    how: "このあたりにアブラゼミの記録が 50 件あります。代々木公園の入口に置きました。近づくと鳴るのは 7 月から 9 月の昼だけ。",
    src: [INAT("Graptopsaltria nigrofuscata", "アブラゼミ 50 件"), C("Aburazemi 07z7315.ogg / Cory / Wikimedia Commons（CC BY 2.1 JP）", CM("Aburazemi_07z7315.ogg"))] },
  { id: "n_konoha", cat: "nature", kind: "else", title: "公園の木の葉ずれ", at: { x: -295, z: -1070 }, f: "web/snd/konoha.m4a", amb: { r: 30, bed: true },
    label: "② ほかの場所で録った同じ種類の音（風に鳴る木の葉。録音地の記載なし。この公園の録音ではありません）", who: "Gravity Sound／Wikimedia Commons（CC BY 4.0）",
    how: "代々木公園の入口から、風が木の葉を鳴らす音が重なります（公園の木の種類と数は、ここでは語りません）。", src: [C("Leaves in the wind (Gravity Sound) / Wikimedia Commons（CC BY 4.0）", CM("Leaves_in_the_wind_(Gravity_Sound).wav"))] },
  { id: "n_ogawa", cat: "nature", kind: "else", title: "川の水の音", at: { x: 214, z: 160 }, f: "web/snd/ogawa.m4a", amb: { r: 36, bed: true },
    label: "② ほかの場所で録った水の音（トルコ・ギョレメ近くの小川。渋谷川の録音ではありません）", who: "TwoWings／Wikimedia Commons（CC BY 3.0）",
    how: "稲荷橋から下で、渋谷川は空の下に出ます。ほかの場所の小川の水音を置いています（渋谷川で録った音ではありません）。",
    src: [C("Brook sound.ogg / TwoWings / Wikimedia Commons（CC BY 3.0）", CM("Brook_sound.ogg"))] },
];
