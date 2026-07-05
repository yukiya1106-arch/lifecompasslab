# LIFE COMPASS LAB

GitHub Pagesで公開するための、LIFE COMPASS LAB公式サイトです。

## 構成

- Vite
- React
- TypeScript
- Tailwind CSS

## ローカル起動

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
```

ビルド結果は `dist/` に出力されます。

## GitHub Pages公開方法

このサイトは `https://yukiya1106-arch.github.io/lifecompasslab/` で公開する想定です。

1. GitHubの `lifecompasslab` リポジトリに、このフォルダの中身をアップロードします。
2. リポジトリの `Settings` → `Pages` を開きます。
3. `Build and deployment` の `Source` で `GitHub Actions` を選びます。
4. `.github/workflows/deploy.yml` が自動でViteをビルドして公開します。

反映には数分かかることがあります。

最初は手動アップロードではなく、ローカルまたはGitHub上でファイルを置いたあと、GitHub Actions設定を追加するのがおすすめです。

## 画像差し替え

画像は `public/assets/` に置いています。

- `lifecompasslab-hero.png`
- `lifecompasslab-logo-wide.png`

ファイル名を変えずに差し替えると、コード側の変更なしで反映できます。

## ツール追加方法

ツール情報は `src/data/toolsData.ts` の `tools` 配列で管理しています。

新しいツールを追加するときは、`tools` 配列に1件追加してください。

```ts
{
  title: "ツール名",
  category: "表示用カテゴリ",
  categories: ["フィルター用カテゴリ"],
  status: "公開中",
  description: "ツールの説明文",
  url: "https://example.com/",
  buttonLabel: "試してみる",
  icon: "compass",
  featured: false,
}
```

- トップページに出したい場合は `featured: true` にします。
- トップページに表示されるFeatured Toolsは最大3件です。
- `status` は `公開中` / `開発中` / `構想中` のいずれかにします。
- `categories` はカテゴリフィルターに使われます。

## LAB LOG追加方法

LAB LOGは `src/data/labLogData.ts` の `labLogs` 配列で管理しています。

新しいログを追加するときは、配列の一番上に1件追加してください。トップページには最新3件だけ表示され、LAB LOGページにはすべて表示されます。

```ts
{
  date: "2026.07.06",
  title: "ログのタイトル",
  summary: "短い要約",
  body: "詳細本文",
}
```

関連リンクを付けたい場合は、以下も追加できます。

```ts
linkLabel: "関連リンクの表示名",
linkUrl: "https://example.com/",
```
