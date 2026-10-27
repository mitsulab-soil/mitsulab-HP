# Qualium 渋谷

mitsulab の作品《Qualium 渋谷》です。Qualium は、ひとつの場所に Qualia の層（sight・sound・touch・sho など）が重なる場で、大宮・川越に続く三つめの場所です。

谷の底の渋谷駅前から、大山道の坂（宮益坂・道玄坂）、暗渠と、空の下に出る渋谷川、金王八幡宮、公園通り、代々木公園・明治神宮の入口までを、実寸の 3D の中で歩きます。写実の地の上に、光の等高線や地面のグリッドなどの情報の層と、Qualia/sight・touch・sound・nature・culture の五つの層（sound に書の Qualia/sho、culture に歴史を含む）を重ねます。碧（あおい）がそばで、近くの記録を出典つきで話します。

公開先：<https://mitsulab-soil.github.io/aoi-walk-shibuya/> ／ <https://mitsulab.jp/x/14/>

## 歩き方

- **はじめ**：渋谷の町を上空から眺め、始める地点（ハチ公前・宮益坂上・道玄坂上・スクランブル交差点・渋谷川の稲荷橋・金王八幡宮・代々木公園の入口・神宮橋）を選んで「ここから歩く」。
- **歩く**：地面に触れるとそこへ歩きます。ドラッグで見回し、PC は W／↑ でも前へ。
- **飛ぶ**：上の「飛ぶ」。「地上へ降りる」で通りに戻ります。
- **層**：左の一覧で、層ごとに重ねる／外すを切り替えます。光る印に触れると開き、碧がその場所の記録を話します。
- **安全**：渋谷は人の多い町です。歩きながら画面を見ず、立ち止まって見てください。
- 「現在地で歩く」を選んだときだけ、端末の中で位置情報を使います。外へ送るものはありません。

## 模式であること

- 駅のまわりの建物は PLATEAU の 3D 都市モデル（外壁は写真を縮めて、広告や店名が読めないようにしたもの）、その外は OpenStreetMap の平面から作った霧と線の模式です。高さは OSM の記録か、面積から決めました。店名・看板・ロゴ・広告は描いていません。
- 公園と境内の木、金王八幡宮の鳥居は模式です（一本ずつの位置や実物の寸法ではありません）。
- 暗渠の光の線は OpenStreetMap の線から描いた模式です。
- 鳥や水の音は、ほかの場所で録った同じ種類の音です（渋谷で録った音ではありません。画面に録音地を出しています）。

## 出典とライセンス

- 記録の典拠：国土交通省 関東地方整備局 川崎国道事務所「大山街道見どころマップ 赤坂～三軒茶屋 1B」・東京都建設局「渋谷川・古川流域とは」・渋谷区「通りの名前」・渋谷区 土木部道路課「オオヤマカイドーニュース」・金王八幡宮 公式「由緒」・明治神宮 公式「明治神宮とは」・東京都公園協会「代々木公園」・GO TOKYO「渋谷ストリーム」。数値と事実を出典つきで話しています（図や表は写していません）。URL は画面の「出典と確かさ」に。
- 鳥の錐体：Hart 2001。生きものの記録の数：[iNaturalist](https://www.inaturalist.org/) の投稿者のみなさん。
- 建物（駅のまわり約 330 m）：国土交通省 Project PLATEAU「3D都市モデル（Project PLATEAU）東京都23区」（2020 年度・LOD2・[G 空間情報センター](https://www.geospatial.jp/ckan/dataset/plateau-tokyo23ku)・[PLATEAU Site Policy](https://www.mlit.go.jp/plateau/site-policy/)）をもとに mitsulab が加工して作成（形の間引き・外壁の写真を縮めて細部をつぶし、窓の筋を足した）。
- 地形：国土地理院 標高タイル（DEM5A）・全国最新写真（シームレス）を mitsulab が加工して作成（[地理院タイル一覧](https://maps.gsi.go.jp/development/ichiran.html)）
- 道・建物の平面・川・公園：© [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors（ODbL）
- 質感：[Poly Haven](https://polyhaven.com/)（Asphalt 04・Concrete Pavement・Granite Tile・Dark Wooden Planks ほか・空 Kloofendal 48d Partly Cloudy (Pure Sky)）・[ambientCG](https://ambientcg.com/)（Metal058B）、いずれも CC0。
- 音：Wikimedia Commons・xeno-canto ほか（CC BY・CC BY-SA ほか。作者と条件は画面の札と `web/app/sounds.js` に）
- イソヒヨドリ・ハクセキレイの 3D：mitsulab の自作
- 書：上原光瑛（© mitsulab）
- 3D の表示：[three.js](https://threejs.org/)（MIT）・[@pixiv/three-vrm](https://github.com/pixiv/three-vrm)（MIT）
- 碧の 3D：© mitsulab（VRoid Studio で作成した VRM・`web/aoi.vrm`）。この作品の中で碧を表示するためだけに置いています。VRM の利用条件は「アバターとして使えるのは作者のみ・再配布不可・改変不可」です。ファイルを取り出して、ほかで使ったり配ったりしないでください。
- 碧の声：VOICEVOX:冥鳴ひまり（[VOICEVOX](https://voicevox.hiroshiba.jp/)・[冥鳴ひまりの利用規約](https://www.meimeihimari.com/terms-of-use)）。前もって一行ずつ作った音（`web/voice/`）を鳴らしています。

## 著作権 ／ Copyright

© 2026 mitsulab. All rights reserved. この作品の文章・画像・音声・3D・プログラムの著作権は、別に示した他者の素材を除き mitsulab にあります。無断の複製・転載・改変と、AI の学習・生成への利用はお断りします（テキスト・データマイニングの権利を留保します）。 [利用規約](https://mitsulab.jp/terms/#ai)

© 2026 mitsulab. All rights reserved. Copyright in the text, images, audio, 3D and software of this work belongs to mitsulab, except third-party materials credited separately. Copying, reposting or modifying them without permission, and using them for AI training or generation, are not permitted. Text and data mining rights are reserved. [Terms](https://mitsulab.jp/terms/#ai-en)

他者の素材（ODbL・CC0・CC BY・CC BY-SA・VOICEVOX など）は、それぞれの条件に従います。
