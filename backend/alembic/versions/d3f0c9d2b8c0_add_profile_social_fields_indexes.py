"""Add profile social fields and follow indexes

Revision ID: d3f0c9d2b8c0
Revises: a2255ce489df
Create Date: 2025-09-28 17:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd3f0c9d2b8c0'
down_revision: Union[str, Sequence[str], None] = 'a2255ce489df'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: add is_public & counters to profiles; add indexes to follows."""
    with op.batch_alter_table('profiles') as batch_op:
        batch_op.add_column(sa.Column('is_public', sa.Boolean(), server_default='true', nullable=False))
        batch_op.add_column(sa.Column('follower_count', sa.Integer(), server_default='0', nullable=False))
        batch_op.add_column(sa.Column('following_count', sa.Integer(), server_default='0', nullable=False))

    # Backfill counts (safe no-op initially)
    # Backfill follower_count (number of users following this user)
    op.execute("""
        UPDATE profiles p SET follower_count = sub.fcount
        FROM (
            SELECT followee_id AS user_id, COUNT(*)::int AS fcount
            FROM follows
            GROUP BY followee_id
        ) sub
        WHERE p.user_id = sub.user_id;
    """)

    # Backfill following_count (number of users this user follows)
    op.execute("""
        UPDATE profiles p SET following_count = sub.fcount
        FROM (
            SELECT follower_id AS user_id, COUNT(*)::int AS fcount
            FROM follows
            GROUP BY follower_id
        ) sub
        WHERE p.user_id = sub.user_id;
    """)

    # Indexes on follows
    op.create_index('ix_follows_follower_id', 'follows', ['follower_id'])
    op.create_index('ix_follows_followee_id', 'follows', ['followee_id'])


def downgrade() -> None:
    """Downgrade schema: drop added columns and indexes."""
    op.drop_index('ix_follows_followee_id', table_name='follows')
    op.drop_index('ix_follows_follower_id', table_name='follows')
    with op.batch_alter_table('profiles') as batch_op:
        batch_op.drop_column('following_count')
        batch_op.drop_column('follower_count')
        batch_op.drop_column('is_public')
