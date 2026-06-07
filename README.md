# mitsulab-HP

**mitsulab** 公式ウェブサイトのソースコードです。

🌐 https://mitsulab.jp

---

## ファイル構成

```
mitsulab-HP/
└── index.html   # サイト本体（単一ファイル構成）
└── README.md    # このファイル
```

---

## 技術仕様

- 静的HTML / CSS / JavaScript（単一ファイル）
- 外部依存：Google Fonts のみ
- ホスティング：GitHub Pages
- カスタムドメイン：mitsulab.jp

---

## ローカルでの確認方法

VS Code + Live Server 拡張機能を使用。

1. VS Code でフォルダを開く
2. `index.html` を開く
3. 右下の「Go Live」をクリック
4. ブラウザで `http://127.0.0.1:5500` を確認

---

## デプロイ

`main` ブランチへの push が GitHub Pages へ自動反映されます。

```bash
git add .
git commit -m "更新内容を記述"
git push origin main
```

---
