from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os
import sys

# add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import Base
from app import models  # import all models so alembic sees them

config = context.config

# override sqlalchemy.url with env var if set
database_url = os.getenv("DATABASE_URL")
if database_url:
    # configparser uses % for interpolation — escape any encoded chars (e.g. %40)
    config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
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
    from sqlalchemy import create_engine
    url = config.get_main_option("sqlalchemy.url")
    # un-escape %% back to % for actual connection (configparser escaping)
    url = url.replace("%%", "%")
    connectable = create_engine(url, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
