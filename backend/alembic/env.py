"""Alembic environment."""

from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.config import get_settings
from app.db.session import Base

# Importing the models package is what populates Base.metadata.
import app.models  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", get_settings().database_url)

target_metadata = Base.metadata

# Alembic creates alembic_version.version_num as VARCHAR(32). Revision ids here
# are descriptive and two of them are 33 characters, which PostgreSQL rejects
# (StringDataRightTruncation) while SQLite silently accepts it, so the test
# suite never saw it. Widening the column before migrating fixes new databases
# and repairs one left at the old width by a failed upgrade. Renaming the
# revisions instead would orphan every database already stamped with them.
VERSION_NUM_LENGTH = 64


def _ensure_wide_version_table(connection) -> None:
    if connection.dialect.name != "postgresql":
        return
    connection.exec_driver_sql(
        "CREATE TABLE IF NOT EXISTS alembic_version ("
        f"version_num VARCHAR({VERSION_NUM_LENGTH}) NOT NULL, "
        "CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num))"
    )
    connection.exec_driver_sql(
        "ALTER TABLE alembic_version "
        f"ALTER COLUMN version_num TYPE VARCHAR({VERSION_NUM_LENGTH})"
    )
    connection.commit()


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        _ensure_wide_version_table(connection)
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
