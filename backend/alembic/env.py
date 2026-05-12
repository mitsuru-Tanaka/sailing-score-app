from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
from backend.db import Base  # db.pyからBaseをインポート

# target_metadataにBase.metadataを設定
target_metadata = Base.metadata

# この行はconfig.iniの設定を読み込むために使います
config = context.config

# ログ設定を行います
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

def run_migrations_offline() -> None:
    """Offlineモードでマイグレーションを実行"""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Onlineモードでマイグレーションを実行"""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,  # ここで正しく設定
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()

# オフラインモードかオンラインモードかを判別して実行
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()