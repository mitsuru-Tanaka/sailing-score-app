#!/usr/bin/env python3
"""
ローカルPostgreSQL ↔ Supabase 同期スクリプト
使い方:
  python3 sync.py to_cloud   # ローカル → Supabase
  python3 sync.py from_cloud # Supabase → ローカル
"""
import sys
import os

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("ERROR: psycopg2 が見つかりません。pip install psycopg2-binary でインストールしてください。")
    sys.exit(1)

TABLES = [
    "tournaments",
    "rule_configs",
    "boats",
    "races",
    "race_results",
]

# 各テーブルの主キーと全カラム定義（ORDER はインサート順に依存関係を考慮）
TABLE_PK = {
    "tournaments":  "id",
    "rule_configs": "id",
    "boats":        "id",
    "races":        "id",
    "race_results": "id",
}

def get_columns(conn, table: str) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = %s AND table_schema = 'public' "
            "ORDER BY ordinal_position",
            (table,),
        )
        return [row[0] for row in cur.fetchall()]

def sync_table(src_conn, dst_conn, table: str, direction: str):
    pk = TABLE_PK[table]

    src_cols = get_columns(src_conn, table)
    dst_cols = get_columns(dst_conn, table)
    # 両方に存在するカラムのみ同期（マイグレーション差異を吸収）
    cols = [c for c in src_cols if c in dst_cols]

    if not cols:
        print(f"  [{table}] 共通カラムなし。スキップ。")
        return

    col_list = ", ".join(f'"{c}"' for c in cols)
    placeholders = ", ".join(["%s"] * len(cols))

    update_set = ", ".join(
        f'"{c}" = EXCLUDED."{c}"' for c in cols if c != pk
    )

    upsert_sql = (
        f'INSERT INTO "{table}" ({col_list}) VALUES ({placeholders}) '
        f'ON CONFLICT ("{pk}") DO UPDATE SET {update_set}'
    )

    with src_conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as src_cur:
        src_cur.execute(f'SELECT {col_list} FROM "{table}"')
        rows = src_cur.fetchall()

    if not rows:
        print(f"  [{table}] 転送行なし。")
        return

    with dst_conn.cursor() as dst_cur:
        values = [tuple(row[c] for c in cols) for row in rows]
        psycopg2.extras.execute_batch(dst_cur, upsert_sql, values, page_size=200)

    dst_conn.commit()
    print(f"  [{table}] {len(rows)} 行を同期しました。")

def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ("to_cloud", "from_cloud"):
        print("使い方: python3 sync.py to_cloud | from_cloud")
        sys.exit(1)

    direction = sys.argv[1]

    local_url  = os.environ.get("LOCAL_DB_URL",    "postgresql://localhost/sailing_score_db")
    cloud_url  = os.environ.get("SUPABASE_DB_URL", "")

    if not cloud_url:
        print("ERROR: SUPABASE_DB_URL が設定されていません。")
        print("       backend/.env.sync に SUPABASE_DB_URL=... を設定してください。")
        sys.exit(1)

    print(f"接続中: ローカル ({local_url.split('@')[-1] if '@' in local_url else local_url})")
    local_conn = psycopg2.connect(local_url)
    local_conn.autocommit = False

    print(f"接続中: Supabase ({cloud_url.split('@')[-1] if '@' in cloud_url else '***'})")
    cloud_conn = psycopg2.connect(cloud_url)
    cloud_conn.autocommit = False

    if direction == "to_cloud":
        src, dst, label = local_conn, cloud_conn, "ローカル → Supabase"
    else:
        src, dst, label = cloud_conn, local_conn, "Supabase → ローカル"

    print(f"\n同期開始: {label}")
    try:
        for table in TABLES:
            print(f"  [{table}] 同期中...")
            sync_table(src, dst, table, direction)
        print("\n同期完了。")
    except Exception as e:
        dst.rollback()
        print(f"\nERROR: {e}")
        sys.exit(1)
    finally:
        local_conn.close()
        cloud_conn.close()

if __name__ == "__main__":
    main()
