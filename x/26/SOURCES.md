# 制作素材と借用元

- 場所・物語・時間差・接続線：mitsulabの創作模型。実在の場所の撮影/測量/気象観測ではない。
- 木の形：mitsulab `03_発信/01_HP/js/common-ground-tree.js`、ケヤキの手続き生成。原本を相対参照。
- 土：Poly Haven「Farm Soil」/ Amal Kumar、CC0。https://polyhaven.com/a/farm_soil 。土色・法線を1024px/WebP化。
- 樹皮：Poly Haven「Japanese Zelkova Bark」/ Charlotte Baglioni、CC0。https://polyhaven.com/a/japanese_zelkova_bark 。色・法線を512px/WebP化。
- 土/樹皮はHP既存 `img/hero/3d/dio/{soil_c,soil_n,bark_c,bark_n}.webp` を相対参照。CC管理台帳M-0912と原本を照合。現地の材質計測でなく、配布素材を模型へ使用。権利：https://polyhaven.com/license 。2026-11-07 review05確認。3ファイルは原本から派生bytes一致、soil_cは台帳/画素照合で同定（元の変換手順を完全再現したとはしない）。
- 葉：ambientCG「LeafSet014」、CC0。https://ambientcg.com/view?id=LeafSet014 。HP `img/common-ground/leaf.webp`、木モジュール記載に従う。原本不変更。
- 碧：本人の既存 `img/hero/aoi.vrm`、VRoid原本由来。モデルの権利を外部配布用に変更しない。
- 碧の動き：既存 `js/aoi_motion.js` と依存モジュール。
- Three.js：HP内vendor、MIT。@pixiv/three-vrm：HP内vendor内LICENSE参照。
- 新規有料API・生成画像・第三者の音源は使用しない。
