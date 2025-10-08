"""Add AI thread and message tables

Revision ID: j5_ai_chatbot
Revises: (current head)
Create Date: 2025-01-27 20:00:00.000000

"""


# revision identifiers, used by Alembic.
revision = 'j5_ai_chatbot'
down_revision = 'cbfdce80331d'  # Points to initial migration
branch_labels = None
depends_on = None


def upgrade():
    # Tables already created in initial migration (cbfdce80331d)
    # This migration is kept for version history only
    pass


def downgrade():
    # Nothing to downgrade - tables managed by initial migration
    pass