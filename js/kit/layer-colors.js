// Qualia の五つの層の色（2026-10-23 本人「Qualia の層は 5 つに整理」「層の色はかさねっこの新しい色に合わせる」）。
// TOP の 3D（冒頭・層の図）はここだけを読む。HTML の --c（板の色・札の色）も同じ値にそろえる。
// 出どころ：_共通3D/資料/姿の案10_2026-10-23/README.md（2026-10-23 本人「案１０で採用してください」）。
//   c＝夜の地の線と字に使う「HUD の線と字」の列（HP の地は紺なので、線・札・字はこちら）／body＝かさねっこの体の色。
//   sight と sound は夜の地で色相が近いと採点で指摘されたので、c だけ紫と青へ少し離した（体の色は変えない）。Qualium 氷川・川越の COLOR5 と同じ値。
export const LAYER5 = [
  { key: 'sight',   c: 0xc9abe0, body: 0xa59fc3, name: '藤鼠' },
  { key: 'touch',   c: 0xf0d19d, body: 0xd6c09b, name: '砥粉' },
  { key: 'sound',   c: 0x8fb6dc, body: 0x3a4360, name: '藍鉄' },     // sho を含む
  { key: 'nature',  c: 0x88b68f, body: 0x6c8d71, name: '老竹' },
  { key: 'culture', c: 0xe79592, body: 0x864e4c, name: '小豆' },   // rakugo・history を含む
];
