"""preserve valuation timestamp"""

import sqlalchemy as sa
from alembic import op

revision = "b7d91e6c04a2"
down_revision = "a4f2c39e1871"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("holdings", sa.Column("valuation_observed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column("holdings", "valuation_observed_at")
