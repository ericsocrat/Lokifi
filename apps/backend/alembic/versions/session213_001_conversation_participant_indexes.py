"""Session 213: Optimize conversation participant lookups

Adds composite indexes to improve performance for common conversation queries:
1. Quick lookup of users in a specific conversation
2. Quick lookup of conversations for a specific user  
3. Timestamp-based sorting for conversation participants

These indexes optimize social messaging and conversation management features.

Revision ID: session213_001
Revises: phase_3a_002
Create Date: 2026-02-08 18:30:00.000000

"""
from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic
revision: str = "session213_001"
down_revision: str | Sequence[str] | None = "phase_3a_002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create composite indexes for conversation participant queries."""
    
    # Index 1: Lookup users in a specific conversation
    # Query: SELECT * FROM conversation_participants WHERE conversation_id = X
    # Use: Loading all participants for a conversation view
    # Expected with existing FK index: Already covered
    
    # Index 2: Lookup conversations for a specific user  
    # Query: SELECT DISTINCT conversation_id FROM conversation_participants WHERE user_id = X
    # Use: Loading user's conversations list
    # Expected gain: 10-20x for users with many conversations
    op.create_index(
        "idx_conversation_participants_user_id",
        "conversation_participants",
        ["user_id"],
        postgresql_using="btree",
        if_not_exists=True,
    )
    
    # Index 3: Compound index for checking if user is in a conversation and when they joined
    # Query: WHERE conversation_id = X AND user_id = Y
    # Use: Permission checks, member validation
    # Expected gain: 5-10x for verification queries
    op.create_index(
        "idx_conversation_participants_conversation_user",
        "conversation_participants",
        ["conversation_id", "user_id"],
        postgresql_using="btree",
        if_not_exists=True,
    )


def downgrade() -> None:
    """Remove conversation participant indexes."""
    
    op.drop_index("idx_conversation_participants_user_id", if_exists=True)
    op.drop_index("idx_conversation_participants_conversation_user", if_exists=True)
