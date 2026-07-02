# セーリング得点管理システム 引き継ぎ書類

最終更新: 2026-06-18

このドキュメントは、本プロジェクトを **別アカウント／別担当者に引き継ぐ** ための要点まとめです。
まず「① リンク・アカウント一覧」を上から順に確認し、各サービスのアクセス権を移譲してください。

---

## ① リンク・アカウント一覧（最優先で移譲するもの）

| # | サービス | 役割 | URL | 引き継ぎで必要な作業 |
|---|----------|------|-----|----------------------|
| 1 | **GitHub** | ソースコード本体 | https://github.com/mitsuru-Tanaka/sailing-score-app | リポジトリのコラボレーター追加 or オーナー移譲。新担当者の **Personal Access Token に `workflow` スコープ** を付与（後述④） |
| 2 | **Vercel** | フロントエンド（Next.js）ホスティング | （Vercelダッシュボードで確認） | プロジェクトをTeamへTransfer or 新アカウントを招待。環境変数を移植（後述③） |
| 3 | **Render** | バックエンド（FastAPI）ホスティング | バックエンドAPI: https://sailing-score-app-backend.onrender.com | サービスの所有権移譲 or 新アカウントで再作成。`render.yaml` あり |
| 4 | **Supabase** | DB（PostgreSQL）＋認証 | （Supabaseダッシュボードで確認） | プロジェクトのメンバー追加 or 移譲。接続URL・anon keyを引き継ぐ |
| 5 | 公開アプリ（本番URL） | 実際に使う画面 | （Vercelの本番ドメイン） | 動作確認用 |

> ⚠️ URLが「（…で確認）」となっている箇所は、現オーナーのダッシュボードにログインして実際のURLを控え、この表を埋めてから渡してください。

---

## ② システム構成

```
[ユーザー] ──> Vercel (Next.js / フロント) ──> Render (FastAPI / バック) ──> Supabase (PostgreSQL + Auth)
                                                     ↑
                              GitHub Actions が10分おきにping（スリープ防止）
```

- **2つの動作モード**
  - **クラウドモード**: 通常運用。Vercel + Render + Supabase。
  - **ローカルモード**: 大会当日にMac内で完結（高速・オフライン対応）。`start_local.sh` で起動、ローカルPostgreSQLを使用。`sync_from_cloud.sh` / `sync_to_cloud.sh` でクラウドと同期。
- **技術スタック**
  - フロント: Next.js 16 / React 19 / TypeScript / Supabase Auth
  - バック: FastAPI / SQLAlchemy / openpyxl(Excel) / reportlab(PDF)
  - DB: PostgreSQL（本番=Supabase、ローカル=Homebrew PostgreSQL）

---

## ③ 環境変数（移植が必須）

新しいVercel/Renderに移す際、以下を必ず設定してください。**値は現環境のダッシュボードから取得**します（このリポジトリの `.env.local` 等はgitignoreされており値は含まれません）。

### Vercel（フロントエンド）
| キー | 説明 |
|------|------|
| `NEXT_PUBLIC_API_URL` | RenderバックエンドのURL |
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase匿名キー |

### Render（バックエンド）
| キー | 説明 |
|------|------|
| `DATABASE_URL` | Supabase PostgreSQL接続URL（`render.yaml` でDBから自動注入される設定） |

### ローカルモード用（Mac内・gitignore済み）
- `frontend/.env.local`: `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_MODE=local` ほか（`start_local.sh` が自動生成）
- `backend/.env.local`: `DATABASE_URL` / `AUTH_ENABLED` / `ALLOWED_ORIGINS`
- `backend/.env.sync`: クラウド同期用のSupabase接続URL（初回のみ手動編集）

---

## ④ 引き継ぎ時の注意点（ハマりどころ）

1. **GitHub Actions と PAT の `workflow` スコープ**
   `.github/workflows/keep-alive.yml` があるため、ワークフローを変更してpushするには
   Personal Access Token に **`workflow` スコープ** が必要です。無いと
   `refusing to allow a Personal Access Token to create or update workflow ... without workflow scope`
   というエラーでpushが拒否されます。

2. **Render無料プランのコールドスタート**
   無料プランは約15分アイドルでスリープし、復帰に最大1分かかります。対策として
   - フロント側でタイムアウトを延長し「サーバーを起動しています…」と表示
   - GitHub Actionsで10分おきにpingしてスリープ防止
   を入れてあります。**有料プランにすれば根本解決**します（その場合 keep-alive workflow は不要）。
   pingのURLが変わったら `keep-alive.yml` 内のURLを更新してください。

3. **`backend/db.py` のDB自動判別**
   `DATABASE_URL` の中身を見てローカル/Render/Supabaseを自動判別し、SSL設定を切り替えます。
   ローカル検証時にSQLite固定へ書き換えてコミットしないよう注意（過去にその差分が残っていた経緯あり）。

4. **リポジトリ内の不要物**
   `frontend_broken/`（壊れた旧フロント）、`venv/` `#/` `新しい仮想環境を作成/`（壊れた空のvenv）、
   複数の `*.db` ファイルが残っています。動作には影響しませんが、整理する場合は削除可。

---

## ⑤ ローカル開発・起動方法

```bash
# 依存インストール
cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
cd ../frontend && npm install

# 大会当日のローカルモード起動（ブラウザが自動で開く）
./start_local.sh      # http://localhost:3000
./stop_local.sh       # 停止

# クラウドとの同期
./sync_from_cloud.sh  # 大会前日：クラウド → ローカル
./sync_to_cloud.sh    # 大会後：ローカル → クラウド

# フロントの本番ビルド確認
cd frontend && npm run build
```

詳細は [README.md](README.md) を参照。

---

## ⑥ 主な機能（アプリでできること）

アプリ内の **「ヘルプ」ページ（`/help`）** に画面・機能の説明をまとめてあります。概要:

- 大会の作成・管理（個人戦／団体戦3艇・4艇／複合集計）
- 艇（参加者）の登録・編集・CSV一括取り込み・PDF出力
- 採点ルールの設定（プリセット、カット数、ペナルティ係数、DNE/SP/付則T等）
- レース結果の入力（着順入力タブ／艇別入力タブ、リザルトコード対応）
- 総合順位の自動集計・自動更新・PDF/Excel出力
- アカウント設定、管理者によるユーザー招待

---

## ⑦ 直近セッションでの変更履歴（2026-06-18）

| コミット | 内容 |
|----------|------|
| `fd488e7` | Renderコールドスタート対策（タイムアウト延長＋keep-alive ping追加） |
| `ffdbca3` | ダークテーマ導入・TopBar刷新・順位表タイムアウト修正 |
| `3161286` | 全ページの文字色をダークテーマ対応（可読性修正） |
| `e95e4d5` | 実用面の改善6点（エラー処理の原因区別・結果保存の軽量化・トースト通知・モバイル折返し・順位表の手動更新/自動更新トグル・順位表エラー明確化） |
| `9a37bad` | ダークテーマのコントラストを全ページで統一（白背景=濃い文字／濃い背景=明るい文字） |
| `c9d6759` | ヘルプ・使い方ガイドページ（`/help`）を追加 |

### 既知のTODO（未対応・任意）
- `backend/main.py` が約2,700行の単一ファイル。ルーター分割でメンテ性向上の余地あり。
- 順位計算がリクエストごとの全件計算。データ量が増えるとキャッシュ最適化の検討余地あり。

## ⑦-2 2026-07-02 の変更（速報機能ほか）

- `TournamentNav` をダークテーマ対応（TODO解消）。
- **管理タブは admin のみ表示**（TopBar が `/auth/me` のロールを見て制御。`frontend/lib/me.ts` に sessionStorage キャッシュ付きの getMe() を追加）。
- **速報（途中経過）機能を追加**:
  - `users.live_reporter` カラム追加。管理者ページの「速報担当」トグルでON/OFF（`PUT /admin/users/{id}/live-reporter`）。
  - 大会内タブ「速報」（`/tournaments/[id]/live`）は admin または速報担当のみ表示・アクセス可。
  - 1上・2上・3上・finish・任意地点の回航順位を艇タップで入力 → `live_reports` テーブルに保存（同一クラス/レース/地点は上書き）。SNS用テキストのコピー機能付き。
  - API: `GET/PUT /tournaments/{id}/live-reports`, `DELETE /tournaments/{id}/live-reports/{report_id}`。
  - 速報担当は全大会の閲覧（一覧・艇・レース）が可能（`check_tournament_access(allow_live_reporter=True)`）。
- バグ修正: `_MIGRATIONS` に `rule_configs` のペナルティ係数5カラム（stp_penalty_points 等）が欠けており、既存DBで大会作成が500になる問題を修正。
- バグ修正: 大会の完全削除で `series` / `ranking_profiles` / `live_reports` が削除されずFK違反になる問題を修正。

---

## ⑧ 引き継ぎチェックリスト

- [ ] GitHubリポジトリのアクセス権を移譲した
- [ ] 新担当者のPATに `workflow` スコープを付与した
- [ ] Vercelプロジェクトを移譲し、環境変数3つを設定した
- [ ] Renderサービスを移譲し、`DATABASE_URL` を確認した
- [ ] Supabaseプロジェクトのメンバー追加 or 移譲した
- [ ] keep-alive workflow のpURLが正しいか確認した
- [ ] 本番URLでログイン〜順位表表示まで動作確認した
- [ ] ①の表の「（…で確認）」を実URLで埋めた
