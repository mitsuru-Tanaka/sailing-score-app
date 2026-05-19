# セーリング得点管理システム

セーリング競技の得点集計・順位管理アプリケーション。

## 2つの動作モード

| モード | 用途 | 構成 |
|--------|------|------|
| **クラウドモード** | 大会準備・艇登録・通常運用 | Vercel + Render + Supabase |
| **ローカルモード** | 大会当日の結果入力（高速・オフライン対応） | Mac内で完結 |

---

## ローカルモードの初回セットアップ

### 1. PostgreSQL のインストール

```bash
brew install postgresql@16
brew services start postgresql@16
createdb sailing_score_db
```

### 2. Python 依存パッケージのインストール

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Node.js 依存パッケージのインストール

```bash
cd frontend
npm install
```

### 4. 同期設定ファイルの作成（初回のみ）

`backend/.env.sync` を編集して Supabase の接続 URL を設定します。

```bash
# Supabase ダッシュボード → Settings → Database → Connection string (URI) を参照
# backend/.env.sync を開いて SUPABASE_DB_URL を実際の値に書き換えてください
```

---

## 大会当日の推奨手順

### ステップ 1: 大会前日（クラウド → ローカルにデータ取得）

```bash
./sync_from_cloud.sh
```

Supabase に登録済みの大会・艇データをローカルにコピーします。

### ステップ 2: 大会当日（ローカル起動）

```bash
./start_local.sh
```

- ブラウザが自動で開きます（http://localhost:3000）
- 同じ Wi-Fi の別端末からは表示されるIPアドレスでアクセス可能
- ナビバーに **「ローカルモード」** (オレンジ) と表示されます

停止するには：

```bash
./stop_local.sh
# または start_local.sh を実行中のターミナルで Ctrl+C
```

### ステップ 3: 大会終了後（ローカル → クラウドにデータ同期）

```bash
./sync_to_cloud.sh
```

ローカルで入力したレース結果を Supabase に反映します。

---

## クラウドモード（通常運用）

Vercel にデプロイされたフロントエンドを使用します。
ナビバーに **「クラウドモード」** と表示されます。

環境変数（Vercel / Render に設定済み）：

| 変数 | 説明 |
|------|------|
| `NEXT_PUBLIC_API_URL` | Render バックエンド URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー |
| `DATABASE_URL` | Supabase PostgreSQL 接続 URL |

---

## ログの確認（ローカルモード）

```bash
tail -f backend.log   # バックエンドログ
tail -f frontend.log  # フロントエンドログ
```

---

## ディレクトリ構成

```
sailing-score-app/
├── backend/
│   ├── main.py          # FastAPI アプリ
│   ├── db.py            # DB接続（ローカル/クラウド自動判別）
│   ├── sync.py          # 同期スクリプト（Python）
│   ├── .env.local       # ローカル用環境変数（gitignore済み）
│   └── .env.sync        # 同期設定（gitignore済み・要編集）
├── frontend/
│   ├── app/
│   └── .env.local       # ローカル用フロントエンド設定（gitignore済み）
├── start_local.sh       # ローカル起動
├── stop_local.sh        # ローカル停止
├── sync_to_cloud.sh     # ローカル → Supabase 同期
└── sync_from_cloud.sh   # Supabase → ローカル 同期
```
