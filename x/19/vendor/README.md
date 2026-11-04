# HP の同版描画ライブラリ

2026-10-17。公開 TOP の初回描画で CDN の4依存の取得に8.33秒待つ事例を確認したため、既存 Qualium の同梱版をコピー。バージョンとライブラリのソースは変更していない。

- Three.js 0.170.0 — MIT、three/LICENSE。https://github.com/mrdoob/three.js/tree/r170
- @pixiv/three-vrm 3.5.5 — MIT、three-vrm/LICENSE。https://github.com/pixiv/three-vrm/tree/v3.5.5
- meshopt_decoder.module.js は Three.js 同梱物。ファイル内 MIT 著作権表記を維持。

最初に必要な Three.js と地理データを並列取得。モデル用ローダー・VRM ライブラリ・詳細の地形と碧は、必要になる場面で取得する。造形・解像度・描画設定は変更していない。
