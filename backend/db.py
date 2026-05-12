import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:////tmp/sailing.db")
print(f"[db] DATABASE_URL scheme: {DATABASE_URL.split('://')[0]}")

# Render の PostgreSQL は "postgres://" で始まるが SQLAlchemy は "postgresql://" が必要
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    # Supabase / Render PostgreSQL は SSL 必須。URL に sslmode がなければ追加する
    if "sslmode" not in DATABASE_URL:
        sep = "&" if "?" in DATABASE_URL else "?"
        DATABASE_URL = f"{DATABASE_URL}{sep}sslmode=require"
    connect_args = {"sslmode": "require"}

print(f"[db] connect_args: {connect_args}")

try:
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    print("[db] DB connection OK")
except Exception as e:
    print(f"[db] DB connection FAILED: {type(e).__name__}: {e}")
    raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
