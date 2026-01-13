# 数独Webアプリケーション 実装計画

Python (Flask) と Javascript を使用して、高機能でデザイン性の高い数独Webアプリケーションを構築します。

## ユーザーレビューが必要な項目
- **ランキング機能**: 他のユーザーの戦績を表示するため、単純なSQLiteデータベースを使用しますが、ローカル環境での動作を想定しています。
- **デザイン**: グラスモフィズムとダークモードを基調としたモダンなデザインを採用します。

## 提案される変更点

### バックエンド (Python/Flask)
バックエンドは数独の生成、解法、およびスコア管理を担当します。

#### [NEW] [app.py](file:///c:/Users/konbu/sudoku/app.py)
- Flaskサーバーのメインエントリーポイント。
- ルーティング: `/`, `/api/puzzle`, `/api/score`, `/api/ranking`.

#### [NEW] [sudoku_engine.py](file:///c:/Users/konbu/sudoku/sudoku_engine.py)
- 数独の生成ロジック。
- 難易度（初級、中級、上級、エキスパート、エクストリーム）に応じた穴あけロジック。
- バックトラッキングによる解法アルゴリズム（一意性の確認）。

#### [NEW] [database.py](file:///c:/Users/konbu/sudoku/database.py)
- SQLite3を使用したデータの保存。
- テーブル: `users` (username, user_id), `scores` (user_id, difficulty, clear_time, date).

---

### フロントエンド (HTML/CSS/JS)
フロントエンドは対話的なゲーム体験とリッチなUIを提供します。

#### [NEW] [static/css/style.css](file:///c:/Users/konbu/sudoku/static/css/style.css)
- デザインシステム: 深い青や紫を基調としたダークモード。
- グラスモフィズム効果 (背景のぼかし、半透明のパネル)。
- アニメーション: セル選択、数字入力時のフェードイン、エラー時の揺れ。

#### [NEW] [static/js/game.js](file:///c:/Users/konbu/sudoku/static/js/game.js)
- ゲームの状態管理。
- クリアタイムの計測 (タイマー機能) とリアルタイム表示。
- モード切り替え: 「高速鉛筆」、「ライトニングモード」。
- ヒント機能の実装。
- キーボードおよびマウス入力のハンドリング。
- クッキー/localStorageによるユーザー名の永続化。

#### [NEW] [templates/index.html](file:///c:/Users/konbu/sudoku/templates/index.html)
- メインのゲーム画面。
- 設定、戦績、ランキングのオーバーレイ表示。

---

## 検証プラン

### 自動テスト
- `sudoku_engine.py` の単体テスト:
  - `python -m unittest tests/test_engine.py` を作成し、生成されたパズルが解けること、難易度に基づいていることを確認。

### 手動検証
1. **初期アクセス**: ユーザー名を尋ねるポップアップが表示されること。
2. **ゲームプレイ**:
   - 数字をマウス/キーボードで入力できること。
   - タイマーが正しく作動し、クリア時に停止すること。
   - 3回ミスでリトライプロンプトが出ること。
   - 「高速鉛筆」をオンにすると、空きマスに候補数字が表示されること。
   - 「ライトニング」モードで数字を先に選び、マスをタップして埋められること。
3. **戦績とランキング**:
   - クリア後に戦績 (難易度、クリアタイム) が保存され、ランキングに反映されること。
   - ブラウザをリロードしてもユーザー名が維持されていること。
