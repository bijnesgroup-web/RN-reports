import os
import sys
from logging.config import fileConfig

from sqlalchemy import create_engine, pool
from alembic import context

from dotenv import load_dotenv

# -----------------------------
# FIX: Add project root to sys.path
# -----------------------------
# env.py is inside: server/alembic/env.py
# We add the parent folder (/server) to Python imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
# -----------------------------

# Load .env
load_dotenv()

# Alembic Config
config = context.config

# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import Base from your models
# Make sure server/__init__.py exists
from models import Base

# Metadata for autogenerate
target_metadata = Base.metadata

# Load DATABASE_URL from .env
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is missing in .env file")

# Set sqlalchemy.url dynamically
config.set_main_option("sqlalchemy.url", DATABASE_URL)


def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode."""
    engine = create_engine(DATABASE_URL, poolclass=pool.NullPool)

    with engine.connect() as connection:
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
