"""Merge AI and profile migrations

Revision ID: 8fbb9c633bbf
Revises: d3f0c9d2b8c0, j5_ai_chatbot
Create Date: 2025-09-28 23:41:49.574305

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8fbb9c633bbf'
down_revision: Union[str, Sequence[str], None] = ('d3f0c9d2b8c0', 'j5_ai_chatbot')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
