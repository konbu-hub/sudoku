# 手順書: Vercel Postgresを使ったランキングの永続化設定

数独アプリを更新し、Vercel上ではPostgreSQLを、ローカル開発ではSQLiteを自動的に使い分けるようにしました。これにより、Vercelにデプロイしてもランキングデータが消えないようになります。

## 変更点
- **データベースの自動切替**: `database.py` が環境に応じて自動的にPostgreSQL（Vercel用）とSQLite（PC用）を切り替えます。
- **依存関係の追加**: `requirements.txt` に `psycopg2-binary` を追加しました。

## 必要な作業: VercelでNeonデータベースを作成（直接連携）
Vercelの連携機能を使って、直接Neonデータベースを作成・接続します。

1.  **マーケットプレイスから連携**:
    - [Vercelダッシュボード](https://vercel.com/dashboard) でプロジェクトを開きます。
    - **Storage** タブ（または **Integrations**）を開き、**Browse Marketplace** や **Connect Store** などをクリックして **Neon** を探します。
    - **Neon** を選択し、**Add Integration** をクリックします。

2.  **データベースの作成**:
    - 画面の指示に従い、Neonアカウントの連携（または作成）を行います。
    - 新しいデータベースを作成するよう選択します。
    - これにより、自動的に `POSTGRES_URL` などの環境変数がVercelプロジェクトに追加されます。

3.  **環境変数の確認**:
    - **Settings** -> **Environment Variables** を開き、`POSTGRES_URL` が追加されていることを確認してください。

4.  **再デプロイ**:
    - 環境変数を反映させるため、**Deployments** タブに行き、最新のデプロイのメニューから **Redeploy** を行います。

> [!TIP]
> **動作確認**:
> 再デプロイ完了後、Vercel上の本番サイトでゲームをプレイし、クリアしてみてください。ページをリロードしてもランキングに名前が残っていれば成功です！

## ローカルでの利用
ローカル環境（あなたのPC）では、これまで通り以下のコマンドで起動できます：
```bash
python app.py
```
起動時にコンソールに `Database initialized (SQLite).` と表示され、手元の `sudoku.db` ファイル（SQLite）が使用されます。設定変更は不要です。
