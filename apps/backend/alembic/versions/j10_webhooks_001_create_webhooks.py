"""J10 Webhooks - Create webhooks and webhook_deliveries tables

Revision ID: j10_webhooks_001
Revises: j9_api_keys_001
Create Date: 2026-02-06 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "j10_webhooks_001"
down_revision = "j9_api_keys_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create webhooks and webhook_deliveries tables."""
    # Create webhooks table
    op.create_table(
        "webhooks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("url", sa.String(length=2048), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("events", sa.String(length=1000), nullable=False),
        sa.Column("secret", sa.String(length=255), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "status",
            sa.Enum("ACTIVE", "INACTIVE", "FAILED", name="webhookstatus"),
            nullable=False,
            server_default="ACTIVE",
        ),
        sa.Column("max_retries", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("retry_delay_seconds", sa.Integer(), nullable=False, server_default="60"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("last_triggered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("successful_deliveries", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_deliveries", sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_webhooks_active", "webhooks", ["active"])
    op.create_index("idx_webhooks_created_at", "webhooks", ["created_at"])
    op.create_index("idx_webhooks_last_triggered", "webhooks", ["last_triggered_at"])
    op.create_index("idx_webhooks_status", "webhooks", ["status"])

    # Create webhook_deliveries table
    op.create_table(
        "webhook_deliveries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("webhook_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event", sa.String(length=255), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("PENDING", "SUCCESS", "FAILED", "RETRYING", name="deliverystatus"),
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column("http_status_code", sa.Integer(), nullable=True),
        sa.Column("response_body", sa.Text(), nullable=True),
        sa.Column("attempt", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["webhook_id"], ["webhooks.id"], ondelete="CASCADE", name="fk_webhook_deliveries"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_webhook_deliveries_created_at", "webhook_deliveries", ["created_at"])
    op.create_index("idx_webhook_deliveries_event", "webhook_deliveries", ["event"])
    op.create_index("idx_webhook_deliveries_next_retry", "webhook_deliveries", ["next_retry_at"])
    op.create_index("idx_webhook_deliveries_status", "webhook_deliveries", ["status"])
    op.create_index("idx_webhook_deliveries_webhook_id", "webhook_deliveries", ["webhook_id"])


def downgrade() -> None:
    """Drop webhooks and webhook_deliveries tables."""
    op.drop_table("webhook_deliveries")
    op.drop_table("webhooks")
    # Drop enums
    op.execute("DROP TYPE IF EXISTS deliverystatus;")
    op.execute("DROP TYPE IF EXISTS webhookstatus;")
