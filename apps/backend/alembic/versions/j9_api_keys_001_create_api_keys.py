"""Create api_keys table

Revision ID: j9_api_keys_001
Revises: j8_email_templates_001
Create Date: 2026-02-06 23:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "j9_api_keys_001"
down_revision = "j8_email_templates_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create api_keys table with indexes."""
    op.create_table(
        "api_keys",
        # Primary key (UUID)
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        # Key data (hashed - never store plain text)
        sa.Column("key_hash", sa.String(255), unique=True, nullable=False),
        sa.Column("key_prefix", sa.String(12), nullable=False),
        # Metadata
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        # Permissions and limits
        sa.Column("scopes", postgresql.JSON, nullable=True, server_default="[]"),
        sa.Column("rate_limit", sa.Integer, nullable=False, server_default="60"),
        # Expiry and usage tracking
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        # Status
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        # Audit fields
        sa.Column(
            "created_by",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )

    # Create indexes
    op.create_index("ix_api_keys_key_hash", "api_keys", ["key_hash"], unique=True)
    op.create_index("ix_api_keys_key_prefix", "api_keys", ["key_prefix"])
    op.create_index("ix_api_keys_name", "api_keys", ["name"])
    op.create_index("ix_api_keys_rate_limit", "api_keys", ["rate_limit"])
    op.create_index("ix_api_keys_expires_at", "api_keys", ["expires_at"])
    op.create_index("ix_api_keys_is_active", "api_keys", ["is_active"])
    op.create_index("ix_api_keys_created_by", "api_keys", ["created_by"])
    op.create_index("ix_api_keys_created_at", "api_keys", ["created_at"])

    # Create composite indexes for common queries
    op.create_index("ix_api_keys_active_expires", "api_keys", ["is_active", "expires_at"])
    op.create_index("ix_api_keys_created_by_active", "api_keys", ["created_by", "is_active"])


def downgrade() -> None:
    """Drop api_keys table and indexes."""
    op.drop_index("ix_api_keys_created_by_active", table_name="api_keys")
    op.drop_index("ix_api_keys_active_expires", table_name="api_keys")
    op.drop_index("ix_api_keys_created_at", table_name="api_keys")
    op.drop_index("ix_api_keys_created_by", table_name="api_keys")
    op.drop_index("ix_api_keys_is_active", table_name="api_keys")
    op.drop_index("ix_api_keys_expires_at", table_name="api_keys")
    op.drop_index("ix_api_keys_rate_limit", table_name="api_keys")
    op.drop_index("ix_api_keys_name", table_name="api_keys")
    op.drop_index("ix_api_keys_key_prefix", table_name="api_keys")
    op.drop_index("ix_api_keys_key_hash", table_name="api_keys")
    op.drop_table("api_keys")
