from alembic import context

from lokifi import models  # noqa: F401
from lokifi.database import Base, engine

with engine.connect() as connection:
    context.configure(connection=connection, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()
