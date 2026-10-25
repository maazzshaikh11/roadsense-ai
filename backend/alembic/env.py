import os, sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.db.models import Base
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)
target_metadata = Base.metadata
def run_migrations_offline():
    context.configure(url=os.environ.get("DATABASE_URL", config.get_main_option("sqlalchemy.url")), target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
def run_migrations_online():
    cfg = config.get_section(config.config_ini_section, {})
    cfg["sqlalchemy.url"] = os.environ.get("DATABASE_URL", cfg.get("sqlalchemy.url"))
    connectable = engine_from_config(cfg, prefix="sqlalchemy.", poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
