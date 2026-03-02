# PostFlow セットアップ手順

## 1. Supabaseのテーブルを作成

Supabaseダッシュボード → SQL Editor → 以下を実行：

```sql
-- schema.sql の内容をそのまま貼り付けてRun
```

## 2. GitHubにアップロード

```bash
# このフォルダ全体をGitHubのリポジトリにプッシュ
git init
git add .
git commit -m "PostFlow initial"
git remote add origin https://github.com/YOUR_USERNAME/postflow.git
git push -u origin main
```

## 3. Vercelでデプロイ

1. https://vercel.com にアクセス
2. 「Add New Project」→ GitHubのpostflowリポジトリを選択
3. Framework Preset: **Vite** を選択
4. 「Deploy」ボタンを押すだけ

デプロイ完了後、発行されたURLにアクセスすれば使えます。

## 4. スマホのホーム画面に追加（PWA）

### iPhone/iPad (Safari)
1. Safariでアプリを開く
2. 画面下の共有ボタン（□↑）をタップ
3. 「ホーム画面に追加」をタップ
4. 「追加」をタップ

### Android (Chrome)
1. Chromeでアプリを開く
2. メニュー（⋮）→「ホーム画面に追加」

## データ同期について

- データはSupabaseに保存されます
- 同じブラウザからアクセスすると同じデータが表示されます
- **異なるデバイスで同じデータを使いたい場合は**、ブラウザのlocalStorageに保存されているユーザーIDを揃える必要があります（将来的にログイン機能を追加することで解決できます）

## ローカル開発

```bash
npm install
npm run dev
```
