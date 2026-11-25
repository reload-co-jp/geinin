# Next.js Static Site Template

Next.js 16 + React 19 + TypeScript を使用した静的サイト生成のテンプレートリポジトリです。GitHub Pages へのデプロイが自動化されています。

## 技術スタック

- **Next.js** 16 - App Router / Static Export
- **React** 19
- **TypeScript** 5
- **ESLint** 9 - Flat Config
- **Prettier** 3

## このテンプレートの使い方

1. **「Use this template」ボタン**をクリックして新しいリポジトリを作成
2. リポジトリをクローン
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   cd YOUR_REPO
   ```
3. 依存関係をインストール
   ```bash
   pnpm install
   ```
4. 開発サーバーを起動
   ```bash
   pnpm dev
   ```

## セットアップ後にやること

### 1. `next.config.js` の修正

`basePath` をリポジトリ名に変更してください：

```js
basePath: process.env.NODE_ENV === "production" ? "/YOUR_REPO_NAME" : "",
```

### 2. `app/layout.tsx` の修正

メタデータとサイト情報を更新してください：

```tsx
export const metadata: Metadata = {
  title: "Your Site Title",
  description: "Your site description",
}
```

### 3. GitHub Pages の設定

1. リポジトリの **Settings** → **Pages** へ移動
2. **Source** を「GitHub Actions」に設定

## ディレクトリ構成

```
.
├── app/
│   ├── layout.tsx      # ルートレイアウト
│   ├── page.tsx        # ホームページ
│   └── reset.css       # CSSリセット
├── .github/
│   └── workflows/
│       ├── lint.yml    # リント自動実行
│       └── deploy.yml  # GitHub Pages 自動デプロイ
├── next.config.js      # Next.js 設定
├── tsconfig.json       # TypeScript 設定
├── eslint.config.mjs   # ESLint 設定
└── .prettierrc.json    # Prettier 設定
```

## スクリプト

| コマンド         | 説明                                |
| ---------------- | ----------------------------------- |
| `pnpm dev`       | 開発サーバーを起動                  |
| `pnpm build`     | 静的サイトをビルド（`/out` に出力） |
| `pnpm lint`      | ESLint を実行                       |
| `pnpm format`    | Prettier でコードをフォーマット     |
| `pnpm typecheck` | TypeScript の型チェック             |

## 機能

- **静的サイト生成** - `next build` で `/out` に HTML を出力
- **自動デプロイ** - main ブランチへの push で GitHub Pages に自動デプロイ
- **自動リント** - push 時に ESLint / Prettier チェックを実行
- **依存関係の自動更新** - Dependabot による週次チェック
- **エディタ設定** - VS Code での自動フォーマット設定済み

## ライセンス

ISC

## データの追加・更新

- 手入力データ: `data/db.ts`（師弟・共演・賞レースなど。出典と照合したら `last_verified_at` / `checked_at` に日付を入れる）
- 吉本興業 公式プロフィール: `node scripts/import-yoshimoto.mjs` で未取得分を取得（`--all` で全件再取得、1秒1リクエスト、約2時間）。結果は `data/yoshimoto.json`
  - 取り込むのは芸名・読み・結成年月・メンバー・生年月日・出身/入門（NSC期・師匠）の事実項目のみ
  - 手入力データとは名前で統合し、空欄だけを補う（`lib/yoshimoto.ts`）
- その他事務所（松竹芸能・ワタナベ・太田プロ・人力舎・SMA・グレープ・タイタン・マセキ・浅井企画・プライム・サンミュージック・ホリプロコム・ケイダッシュステージ）の公式サイト: `node scripts/import-agencies.mjs [事務所id...]`（`--all` で全件再取得、事務所ごとに1秒1リクエスト、約4分）。結果は `data/agencies.json`
  - 取り込むのは芸名・読み・メンバー名のみ。吉本統合後のデータと名前で統合する（`lib/agencies.ts`）
- Wikipedia 日本語版の基礎情報（Infobox）: `npx tsx scripts/collect-wiki-profiles.ts [--limit 件数]` で未調査の芸人・グループを調べる（50件ずつ、2秒1リクエスト）。結果は `data/wiki-profiles.json`
  - 取り込むのは生年月日・没年月日・養成所と期・師匠（リンク先の記事名）・結成年・解散年のみ。本文は転載しない
  - 公式プロフィール等で埋まっていない項目だけを補い、師匠欄から師弟関係（確度 medium）を足す（`lib/wiki-profiles.ts`）
- 参照切れや出典IDの誤りは `pnpm test` で検出される

## グラフの組み立て

- 同期は「養成所の期」ノード（`t:`）、賞レースは「開催（大会×年）」ノード（`x:`）を中継点に置き、出場者をまとめてつなぐ（`lib/graph.ts`）
  - 開催ノードを選ぶと、サイドパネルに決勝出場者が順位付きで並ぶ
  - 決勝出場同士を直接つなぐと1年だけで40本超の線になるため、開催ノードを中継点にして辺数を抑える（`lib/graph.test.ts` で検証）

## 検索向けの設定（SEO）

- 芸人・コンビ詳細ページの title / description は `lib/meta.ts` で登録データから組み立てる
  - title: 「名前（コンビ名 or メンバー名）のプロフィール｜分かること」。分かることは年齢・相方・同期・師匠・弟子・賞レース成績（決勝が無ければ M-1 戦績）・所属事務所・芸歴のうち、登録されている項目だけを最大4つ
  - description: 所属・相方・生年月日・養成所・デビュー年・師弟（確度高のみ）・賞レース成績の順に、ある項目だけで文にする。定型文で水増ししない
- noindex は芸人・コンビとのつながりが1つも無いページだけ（`isNoindex`）。情報の少ないページ（`isThin`）は検索には残し、サイトマップと事務所一覧からだけ外す
- 関連ニュースは見出しに名前があり、名前が5文字以上か、関係者名・お笑いの語を含む記事だけ出す（`relevantNews`）
- NSC の期ごとの一覧は `/nsc/<校舎>/<期>/`（`app/nsc/shared.ts`）。公式プロフィール・Wikipedia に期の記載がある芸人だけを載せ、デビュー年が同じだけの芸人（`/doki/<年>/`）とは分ける。3人未満の期は noindex
- 賞レースのランキングは `/ranking/` と `/ranking/<種類>/`（`app/ranking/shared.ts`）。登録済みの決勝結果だけを数え、同じ値は同順位（1・2・2・4位）。集計条件と大会ごとの対象年をページに出す
- 師弟関係の一覧は `/shitei/`。登録された師弟関係（`master`）だけを、師匠のいない師匠を起点に系譜として並べ、確度と根拠を添える。先輩・後輩や共演は含めない
- 件数の多い一覧（事務所・五十音・デビュー年・NSCの期）はページ分けする（`lib/paging.ts`）。1ページ目は従来の URL のまま、2ページ目以降は `<一覧のURL>page/<番号>/`。各ページの canonical は自分自身で、検索に出す一覧の2ページ目以降もサイトマップに載せる
