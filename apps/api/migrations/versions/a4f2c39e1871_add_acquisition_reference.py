"""add acquisition reference

Revision ID: a4f2c39e1871
Revises: f30bd4a21670
"""

import sqlalchemy as sa
from alembic import op

revision = "a4f2c39e1871"
down_revision = "f30bd4a21670"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("holdings", sa.Column("acquired_at", sa.Date(), nullable=True))
    op.add_column(
        "holdings", sa.Column("acquisition_price", sa.Numeric(precision=28, scale=10), nullable=True)
    )
    op.add_column("holdings", sa.Column("acquisition_source", sa.String(length=160), nullable=True))


def downgrade():
    op.drop_column("holdings", "acquisition_source")
    op.drop_column("holdings", "acquisition_price")
    op.drop_column("holdings", "acquired_at")
